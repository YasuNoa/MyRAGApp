from typing import Optional, Dict
import os
import shutil
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from pydub import AudioSegment
import google.generativeai as genai
from fastapi import HTTPException

from db import db
from prompts import AUDIO_CHUNK_PROMPT, SUMMARY_FROM_TEXT_PROMPT
from services.rag_service import RagService
from services.vector_service import VectorService

# Setup Logger
logger = logging.getLogger(__name__)

class VoiceService:
    
    @staticmethod
    def get_audio_duration(file_path: str) -> float:
        """Get the duration of an audio file in seconds."""
        try:
            audio = AudioSegment.from_file(file_path)
            return audio.duration_seconds
        except Exception as e:
            logger.error(f"Error reading audio file: {e}")
            return 0.0

    @staticmethod
    def trim_audio(file_path: str, duration_sec: int) -> str:
        """Trim audio file to the specified duration in seconds."""
        try:
            audio = AudioSegment.from_file(file_path)
            trimmed_audio = audio[:duration_sec * 1000] # pydub works in millis
            
            # Save as a new file
            dir_name = os.path.dirname(file_path)
            base_name = os.path.basename(file_path)
            name, ext = os.path.splitext(base_name)
            new_filename = os.path.join(dir_name, f"{name}_trimmed{ext}")
            
            trimmed_audio.export(new_filename, format=ext.replace('.', ''))
            logger.info(f"Trimmed audio saved to: {new_filename}")
            return new_filename
        except Exception as e:
            logger.error(f"Error trimming audio: {e}")
            return file_path

    @staticmethod
    def clean_json_response(text: str) -> str:
        """Clean markdown code blocks."""
        text = text.strip()
        if text.startswith("```"):
            first_newline = text.find("\n")
            if first_newline != -1:
                last_fence = text.rfind("```")
                if last_fence != -1 and last_fence > first_newline:
                    return text[first_newline+1:last_fence].strip()
        return text

    @staticmethod
    async def get_or_create_subscription(user_id: str):
        sub = await db.usersubscription.find_unique(where={'userId': user_id})
        if not sub:
            now = datetime.now(timezone.utc)
            sub = await db.usersubscription.create(
                data={
                    'userId': user_id,
                    'plan': "FREE",
                    'dailyChatCount': 0,
                    'lastChatResetAt': now,
                    'updatedAt': now
                }
            )
        return sub

    @staticmethod
    async def check_and_update_voice_limit(user_id: str, sub, duration_sec: float):
        current_plan = sub.plan
        
        # Init default values if null
        daily_count = sub.dailyVoiceCount or 0
        last_voice_date = sub.lastVoiceDate
        if not last_voice_date:
            last_voice_date = datetime.now(timezone.utc)
            
        monthly_minutes = sub.monthlyVoiceMinutes or 0
        last_voice_reset = sub.lastVoiceResetDate
        if not last_voice_reset:
            last_voice_reset = datetime.now(timezone.utc)
        
        purchased = sub.purchasedVoiceBalance or 0

        now = datetime.now(timezone.utc)
        jst = timezone(timedelta(hours=9))
        now_jst = now.astimezone(jst)

        # Date Reset Logic
        should_reset_daily = False
        if last_voice_date.replace(tzinfo=timezone.utc).astimezone(jst).date() != now_jst.date():
            should_reset_daily = True

        should_reset_monthly = False
        if last_voice_reset.replace(tzinfo=timezone.utc).astimezone(jst).month != now_jst.month:
            should_reset_monthly = True

        # 1. FREE Plan Logic: Max 5 times / day
        if current_plan == "FREE":
            if should_reset_daily:
                daily_count = 0
            
            if daily_count >= 5:
                 raise HTTPException(status_code=403, detail="Free plan daily voice limit reached (5 files/day).")
            
            # Increment Count
            new_count = daily_count + 1
            await db.usersubscription.update(
                where={'userId': user_id},
                data={
                    'dailyVoiceCount': new_count,
                    'lastVoiceDate': now
                }
            )

        # 2. Standard/Premium Logic: Time Limit
        else:
            LIMITS = {"STANDARD": 1800, "PREMIUM": 6000, "STANDARD_TRIAL": 1800} # Minutes
            monthly_limit = LIMITS.get(current_plan, 1800)
            
            if should_reset_monthly:
                monthly_minutes = 0
                last_voice_reset = now
                
            duration_min = int(duration_sec / 60) + 1 # Round up
            
            total_available = monthly_limit + purchased
            if monthly_minutes + duration_min > total_available:
                 raise HTTPException(
                     status_code=403, 
                     detail=f"Monthly audio limit exceeded. {monthly_minutes}m used + {duration_min}m required > {total_available}m available."
                )
                
            # Update Usage
            await db.usersubscription.update(
                where={'userId': user_id},
                data={
                    'monthlyVoiceMinutes': monthly_minutes + duration_min,
                    'lastVoiceResetDate': last_voice_reset
                }
            )

    @classmethod
    async def process_audio(cls, file_path: str, user_id: str, mime_type: str = "audio/mpeg") -> Dict[str, str]:
        """
        Process audio file: Limit check -> Trimming -> Transcription -> Summarization
        """
        try:
            # 1. Get Plan Auth
            sub = await cls.get_or_create_subscription(user_id)
            user_plan = sub.plan
            logger.info(f"User {user_id} plan: {user_plan}")

            final_filename = file_path
            temp_files_to_cleanup = [] # Track any extra temp files created here

            try:
                # 2. Check Duration & Limits
                duration_sec = cls.get_audio_duration(file_path)
                logger.info(f"Audio duration: {duration_sec}s")
                
                if duration_sec < 5.0:
                     raise HTTPException(status_code=400, detail="Audio is too short (min 5 seconds).")
                
                # 3. Plan Logic
                if user_plan == "FREE":
                    # Check Duration Limit (20 mins = 1200s)
                    if duration_sec > 1200:
                        logger.info("Free plan: Trimming >20m audio")
                        trimmed = cls.trim_audio(file_path, 1200)
                        if trimmed != file_path:
                            final_filename = trimmed
                            temp_files_to_cleanup.append(trimmed)
                    
                    # Check/Update Daily Count Limit
                    await cls.check_and_update_voice_limit(user_id, sub, duration_sec)
                    
                else:
                    # Standard/Premium: Time Limit Check
                    await cls.check_and_update_voice_limit(user_id, sub, duration_sec)

                # 4. Chunking & Transcription Strategy
                # Replicating original logic: Split into 10 min (600s) chunks if needed
                CHUNK_DURATION_MS = 600 * 1000 # 10 minutes in milliseconds
                
                transcript_parts = []
                
                # Load audio for chunking
                # Note: loading large file into memory might be heavy, but AudioSegment handles it okay usually.
                audio = AudioSegment.from_file(final_filename)
                duration_ms = len(audio)
                
                chunk_files = []
                try:
                    for i in range(0, duration_ms, CHUNK_DURATION_MS):
                        chunk = audio[i:i + CHUNK_DURATION_MS]
                        chunk_name = f"{final_filename}_part{i//CHUNK_DURATION_MS}.mp3"
                        chunk.export(chunk_name, format="mp3")
                        chunk_files.append(chunk_name)
                        
                    logger.info(f"Split audio into {len(chunk_files)} chunks.")
                    
                    model = genai.GenerativeModel('gemini-2.0-flash')
                    
                    for idx, c_file in enumerate(chunk_files):
                        logger.info(f"Processing chunk {idx+1}/{len(chunk_files)}: {c_file}")
                        c_uploaded = genai.upload_file(c_file, mime_type="audio/mpeg")
                        
                        # Use AUDIO_CHUNK_PROMPT for pure transcription
                        c_resp = model.generate_content(
                            [AUDIO_CHUNK_PROMPT, c_uploaded],
                            generation_config={"response_mime_type": "text/plain"}
                        )
                        
                        # Extract transcript from [TRANSCRIPT] block or raw text
                        text = cls.clean_json_response(c_resp.text)
                        if "[TRANSCRIPT]" in text:
                            text = text.split("[TRANSCRIPT]")[1].strip()
                        
                        if text:
                            transcript_parts.append(text)
                
                finally:
                    # Cleanup chunks
                    for c_file in chunk_files:
                        if os.path.exists(c_file):
                            os.remove(c_file)

                full_transcript = "\n\n".join(transcript_parts)
                
                # 5. Summarization (if transcript exists)
                summary = ""
                if full_transcript:
                    logger.info("Generating summary from full transcript...")
                    # Use SUMMARY_FROM_TEXT_PROMPT
                    
                    sum_prompt = SUMMARY_FROM_TEXT_PROMPT.format(text=full_transcript)
                    sum_resp = model.generate_content(sum_prompt)
                    
                    sum_text = cls.clean_json_response(sum_resp.text)
                    if "[SUMMARY]" in sum_text:
                        summary = sum_text.split("[SUMMARY]")[1].strip()
                    else:
                        summary = sum_text

                return {
                    "transcript": full_transcript,
                    "summary": summary
                }

            finally:
                 # Cleanup only locally created trimmed files, NOT the original Input
                 for f in temp_files_to_cleanup:
                     if os.path.exists(f):
                         os.remove(f)


        except Exception as e:
             logger.error(f"Voice Service Error: {e}")
             if isinstance(e, HTTPException):
                 raise e
             raise HTTPException(status_code=500, detail=str(e))

    @classmethod
    async def save_voice_memo(cls, user_id: str, transcript: str, summary: str, title: str, tags: list[str]) -> Dict[str, str]:
        """
        Save voice memo to DB and Supabase Vector.
        """
        try:
            # 1. Create Document in DB
            content = ""
            if summary:
                content += f"【AI要約】\n{summary}\n\n"
            if transcript:
                content += f"【文字起こし】\n{transcript}"
            
            now = datetime.now(timezone.utc)
            
            doc = await db.document.create(data={
                "userId": user_id,
                "title": title,
                "content": content,
                "summary": summary, # Added missing field
                "source": "voice_memo",
                "mimeType": "audio/mpeg", 
                "fileCreatedAt": now,
                "tags": tags
            })
            
            # 2. Generate Embedding
            vector = RagService.get_embedding(content)
            
            # 3. Upsert to Supabase
            await VectorService.upsert_vectors([{
                "id": doc.id,
                "values": vector,
                "metadata": {
                    "userId": user_id,
                    "dbId": doc.id,
                    "source": "voice_memo",
                    "tags": tags,
                    "type": "audio/mpeg", # map fileType logic to 'type' column
                    "title": doc.title,
                    "createdAt": doc.createdAt.isoformat()
                }
            }])
            
            logger.info(f"Saved voice memo {doc.id} for user {user_id}")
            return {"id": doc.id, "status": "saved"}
            
        except Exception as e:
            logger.error(f"Error saving voice memo: {e}")
            raise HTTPException(status_code=500, detail=str(e))
