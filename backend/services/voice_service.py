
from typing import Optional, Dict, List, Any
import os
import shutil
import uuid
import json
import logging
import subprocess
import asyncio
from datetime import datetime, timezone, timedelta

from pydub import AudioSegment
import google.generativeai as genai
from fastapi import HTTPException, UploadFile

from database.db import db
from services.vector_service import VectorService
from services.user_service import UserService
from services.knowledge_service import KnowledgeService
from services.prompts import (
    AUDIO_CHUNK_PROMPT,
    SUMMARY_FROM_TEXT_PROMPT
)
from schemas.common import clean_json_response

# Setup Logger
logger = logging.getLogger(__name__)

# Timezone Definition
JST = timezone(timedelta(hours=9))

# Initialize GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("GOOGLE_API_KEY not found in environment for VoiceService.")

class VoiceService:
    
    @staticmethod
    async def get_audio_duration(file_path: str) -> float:
        """Get the duration of an audio file in seconds."""
        try:
            # ffmpeg -i input 2>&1 | grep "Duration"
            # Logic from main.py
            cmd = ["ffmpeg", "-i", file_path]
            
            # Use asyncio subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            stderr_text = stderr.decode()

            import re
            match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", stderr_text)
            if match:
                hours, minutes, seconds = map(float, match.groups())
                return hours * 3600 + minutes * 60 + seconds
            return 0.0
        except Exception as e:
            logger.error(f"Error getting audio duration: {e}")
            return 0.0



    @classmethod
    async def process_voice_memo(
        cls, 
        file: UploadFile, 
        metadata: Dict[str, Any],
        save: bool = True
    ) -> Dict[str, Any]:
        """
        Process voice memo with robust logic ported from main.py:
        1. Limit Checks & Truncation
        2. FFMPEG Chunking
        3. Gemini Transcription with Retry
        4. Summarization
        5. Storage via KnowledgeService
        """
        logger.info(f"Processing voice memo for: {file.filename}")
        
        user_id = metadata.get("userId")
        file_id = metadata.get("fileId")
        tags = metadata.get("tags", [])
        
        if not user_id or not file_id:
             raise HTTPException(status_code=400, detail="Missing userId or fileId")

        # 0. Check Limits
        # Resolve UserID first to prevent FK errors
        user_id = await UserService.resolve_user_id(user_id)
        user_plan = await UserService.get_user_plan(user_id)
        
        # Storage Limit
        await UserService.check_storage_limit(user_id)
        
        # 1. Save Temporary
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = {".mp3", ".m4a", ".wav", ".aac", ".caf", ".ogg", ".flac", ".webm"}
        if file_ext not in allowed_exts:
            file_ext = ".mp3"
            
        temp_filename = f"/tmp/{uuid.uuid4()}{file_ext}"
        with open(temp_filename, "wb") as f:
            f.write(content)
            
        current_temp_file = temp_filename
        temp_files_to_cleanup = [temp_filename]

        try:
            # --- Plan-Based Logic: Truncation & Usage Recording ---
            
            # 1. Truncation
            needs_truncation = False
            truncate_seconds = 0
            
            if user_plan == "FREE":
                needs_truncation = True
                truncate_seconds = 1200 # 20 mins
                logger.info("Free Plan detected: Truncating to 20 mins.")
            elif user_plan == "STANDARD" or user_plan == "STANDARD_TRIAL":
                needs_truncation = True
                truncate_seconds = 5400 # 90 mins
                logger.info(f"{user_plan} Plan detected: Truncating to 90 mins.")
            elif user_plan == "PREMIUM":
                needs_truncation = True
                truncate_seconds = 10800 # 180 mins (3 hours)
                logger.info("Premium Plan detected: Truncating to 180 mins.")

            try:
                if needs_truncation:
                    actual_duration = await cls.get_audio_duration(temp_filename)
                    
                    if actual_duration > truncate_seconds:
                        truncated_filename = f"/tmp/{uuid.uuid4()}_truncated{file_ext}"
                        # ffmpeg: -t duration, -acodec copy
                        cmd = ["ffmpeg", "-y", "-i", temp_filename, "-t", str(truncate_seconds), "-acodec", "copy", truncated_filename]
                        
                        process = await asyncio.create_subprocess_exec(
                            *cmd,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        await process.communicate()
                        if process.returncode != 0:
                            raise Exception("FFmpeg truncation failed")
                        
                        current_temp_file = truncated_filename
                        temp_files_to_cleanup.append(truncated_filename)
                        logger.info(f"Truncated from {actual_duration:.1f}s to {truncate_seconds}s")
                
                # 2. Record Usage
                final_duration = await cls.get_audio_duration(current_temp_file)
                sub = await UserService.get_or_create_subscription(user_id)
                await cls.check_and_update_voice_limit(user_id, sub, final_duration)

            except Exception as e:
                logger.error(f"Audio processing/recording failed: {e}")
                if "limit exceeded" in str(e):
                    raise e 
                pass # Proceed if ffmpeg fails?

            # --- Chunking & Segmentation ---
            chunk_duration = 600 # 10 minutes
            temp_dir = f"/tmp/{uuid.uuid4()}"
            os.makedirs(temp_dir, exist_ok=True)
            
            split_pattern = os.path.join(temp_dir, "part%03d" + file_ext)
            logger.info(f"Splitting audio into {chunk_duration}s chunks...")
            
            cmd = [
                "ffmpeg", "-y", "-i", current_temp_file, 
                "-f", "segment", "-segment_time", str(chunk_duration), 
                "-c", "copy", split_pattern
            ]
            process_split = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process_split.communicate()
            if process_split.returncode != 0:
                 raise Exception("FFmpeg splitting failed")
            
            chunks_files = sorted([os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.startswith("part")])
            logger.info(f"Created {len(chunks_files)} chunks: {chunks_files}")
            
            full_transcript = []
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            for i, chunk_path in enumerate(chunks_files):
                logger.info(f"Processing chunk {i+1}/{len(chunks_files)}: {chunk_path}")
                
                chunk_file_upload = genai.upload_file(chunk_path, mime_type=file.content_type or "audio/mpeg")
                
                retry_count = 0
                max_retries = 5
                
                while retry_count < max_retries:
                    try:
                        response = model.generate_content(
                            [AUDIO_CHUNK_PROMPT, chunk_file_upload],
                        )
                        
                        text_resp = response.text
                        chunk_transcript = ""
                        if "[TRANSCRIPT]" in text_resp:
                            chunk_transcript = text_resp.split("[TRANSCRIPT]")[1].strip()
                        else:
                            chunk_transcript = text_resp.strip()
                        
                        full_transcript.append(chunk_transcript)
                        break 
                        
                    except Exception as e:
                        if "429" in str(e) or "Resource exhausted" in str(e):
                            retry_count += 1
                            wait_time = 30 * retry_count 
                            logger.warning(f"Rate limit hit for chunk {i}. Retrying in {wait_time}s... ({retry_count}/{max_retries})")
                            await asyncio.sleep(wait_time)
                        else:
                            logger.error(f"Failed to transcribe chunk {i}: {e}")
                            full_transcript.append(f"(Chunk {i} failed: {e})")
                            break 

                logger.info("Sleeping 10s to respect rate limits...")
                await asyncio.sleep(10)
                # chunk_file_upload.delete() # Clean up remote file if needed

            # Summarization
            final_transcript = "\n\n".join(full_transcript)
            logger.info(f"Full transcript length: {len(final_transcript)} chars")
            
            logger.info("Generating final summary from text...")
            final_summary = "（要約生成失敗）"
            
            try:
                summary_prompt = SUMMARY_FROM_TEXT_PROMPT.format(text=final_transcript[:500000])
                summary_resp = model.generate_content([summary_prompt])
                summary_text = summary_resp.text
                if "[SUMMARY]" in summary_text:
                    final_summary = summary_text.split("[SUMMARY]")[1].strip()
                else:
                    final_summary = summary_text.strip()
            except Exception as e:
                logger.error(f"Summary generation failed: {e}")

            # Cleanup Chunks
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            if not final_transcript:
                 raise HTTPException(status_code=500, detail="Failed to generate transcript")

            # --- Storage via KnowledgeService ---
            
            # Create Document Record
            if save:
                db_id = metadata.get("dbId") or file_id

                await KnowledgeService.create_document_record(
                    doc_id=db_id,
                    user_id=user_id,
                    title=file.filename,
                    source="voice_memo",
                    mime_type=file.content_type,
                    tags=tags
                )
                
                chunks = VectorService.chunk_text(final_transcript)
                vectors = []
                
                for i, chunk in enumerate(chunks):
                    vector_id = f"{user_id}#{db_id}#{i}"
                    embedding = VectorService.get_embedding(chunk)
                    
                    vectors.append({
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {
                            "userId": user_id,
                            "fileId": db_id,
                            "dbId": db_id,
                            "fileName": file.filename,
                            "text": chunk,
                            "chunkIndex": i,
                            "tags": tags,
                            "type": "transcript"
                        }
                    })
                
                if final_summary:
                    summary_id = f"{user_id}#{db_id}#summary"
                    summary_embedding = VectorService.get_embedding(final_summary)
                    vectors.append({
                        "id": summary_id,
                        "values": summary_embedding,
                        "metadata": {
                            "userId": user_id,
                            "fileId": db_id,
                            "dbId": db_id,
                            "fileName": file.filename,
                            "text": final_summary,
                            "chunkIndex": -1,
                            "tags": tags,
                            "type": "summary"
                        }
                    })
                
                if vectors:
                    await VectorService.upsert_vectors(vectors)

                # Save Content to DB
                await KnowledgeService.save_document_content(db_id, final_transcript, summary=final_summary)
                
                # Reward
                await UserService.process_referral_reward(user_id)

            return {
                "status": "success", 
                "transcript": final_transcript,
                "summary": final_summary,
                "chunks_count": len(chunks) if save else 0
            }

        except Exception as e:
            logger.error(f"Error processing voice memo: {e}")
            raise HTTPException(status_code=500, detail="Voice processing failed due to an internal error.")
        finally:
            for f in temp_files_to_cleanup:
                if os.path.exists(f):
                    os.remove(f)

    @staticmethod
    async def check_and_update_voice_limit(user_id: str, sub, duration_sec: float):
        # Re-implementing logic from original VoiceService (which was good) or copying?
        # main.py called `VoiceService.check_and_update_voice_limit`.
        # So I should keep the existing logic in VoiceService for this method.
        # I'll paste the existing logic here.
        
        current_plan = sub.plan
        
        daily_count = sub.dailyVoiceCount or 0
        last_voice_date = sub.lastVoiceDate
        if not last_voice_date:
            last_voice_date = datetime.now(JST)
            
        monthly_minutes = sub.monthlyVoiceMinutes or 0
        last_voice_reset = sub.lastVoiceResetDate
        if not last_voice_reset:
            last_voice_reset = datetime.now(JST)
        
        purchased = sub.purchasedVoiceBalance or 0

        now = datetime.now(JST)
        jst = JST
        now_jst = now

        should_reset_daily = False
        if last_voice_date.replace(tzinfo=timezone.utc).astimezone(jst).date() != now_jst.date():
            should_reset_daily = True

        should_reset_monthly = False
        if last_voice_reset.replace(tzinfo=timezone.utc).astimezone(jst).month != now_jst.month:
            should_reset_monthly = True

        if current_plan == "FREE":
            if should_reset_daily:
                daily_count = 0
            
            if daily_count >= 1:
                 raise HTTPException(status_code=403, detail="Free plan daily voice limit reached (1 file/day).")
            
            if should_reset_monthly:
                monthly_minutes = 0
                last_voice_reset = now

            duration_min = int(duration_sec / 60) + 1 
            if monthly_minutes + duration_min > 300:
                 raise HTTPException(
                     status_code=403, 
                     detail=f"Free plan monthly audio limit exceeded. {monthly_minutes}m used + {duration_min}m required > 300m available."
                )

            await db.usersubscription.update(
                where={'userId': user_id},
                data={
                    'dailyVoiceCount': daily_count + 1,
                    'lastVoiceDate': now,
                    'monthlyVoiceMinutes': monthly_minutes + duration_min,
                    'lastVoiceResetDate': last_voice_reset
                }
            )

        else:
            LIMITS = {"STANDARD": 900, "PREMIUM": 5400, "STANDARD_TRIAL": 900} 
            monthly_limit = LIMITS.get(current_plan, 900)
            
            if should_reset_monthly:
                monthly_minutes = 0
                last_voice_reset = now
                
            duration_min = int(duration_sec / 60) + 1 
            
            total_available = monthly_limit + purchased
            if monthly_minutes + duration_min > total_available:
                 raise HTTPException(
                     status_code=403, 
                     detail=f"Monthly audio limit exceeded. {monthly_minutes}m used + {duration_min}m required > {total_available}m available."
                )
                
            await db.usersubscription.update(
                where={'userId': user_id},
                data={
                    'monthlyVoiceMinutes': monthly_minutes + duration_min,
                    'lastVoiceResetDate': last_voice_reset
                }
            )

    @staticmethod
    async def save_voice_memo(user_id: str, transcript: str, summary: str, title: str, tags: List[str]) -> Dict[str, str]:
        """
        Save voice memo to DB and Supabase Vector (Manual Save from Edit Screen).
        """
        try:
            doc_id = str(uuid.uuid4())
            now = datetime.now(JST)
            
            # 1. Create Document in DB
            await KnowledgeService.create_document_record(
                doc_id=doc_id,
                user_id=user_id,
                title=title,
                source="voice_memo",
                mime_type="audio/mpeg", # Conceptual mime type for voice memo
                tags=tags
            )
            
            # 2. Save Content
            # Note: save_document_content updates the record with content/summary.
            await KnowledgeService.save_document_content(doc_id, transcript, summary=summary)

            # 3. Vectorize
            # We use VectorService directly to ensure 'fileId' metadata matches what frontend expects (if legacy).
            # KnowledgeService uses 'doc_id' as 'dbId'.
            # Mirroring process_voice_memo logic:
            
            chunks = VectorService.chunk_text(transcript)
            vectors = []
            
            for i, chunk in enumerate(chunks):
                vector_id = f"{user_id}#{doc_id}#{i}"
                embedding = VectorService.get_embedding(chunk)
                vectors.append({
                    "id": vector_id,
                    "values": embedding,
                    "metadata": {
                        "userId": user_id,
                        "fileId": doc_id,
                        "dbId": doc_id,
                        "fileName": title,
                        "text": chunk,
                        "chunkIndex": i,
                        "tags": tags,
                        "type": "transcript"
                    }
                })
            
            if summary:
                s_id = f"{user_id}#{doc_id}#summary"
                s_emb = VectorService.get_embedding(summary)
                vectors.append({
                    "id": s_id,
                    "values": s_emb,
                    "metadata": {
                        "userId": user_id,
                        "fileId": doc_id,
                        "dbId": doc_id,
                        "fileName": title,
                        "text": summary,
                        "chunkIndex": -1,
                        "tags": tags,
                        "type": "summary"
                    }
                })
            
            if vectors:
                await VectorService.upsert_vectors(vectors)

            logger.info(f"Saved manual voice memo {doc_id} for user {user_id}")
            return {"id": doc_id, "status": "saved"}

        except Exception as e:
            logger.error(f"Error saving voice memo: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
