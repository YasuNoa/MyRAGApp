提供されたリファクタリング計画に基づき、IDE搭載のAI（GitHub Copilot, Cursor, Windsurf等）がコンテキストとして理解し、コード移行を正確に実行するための設計仕様書を作成しました。

この内容をプロジェクトのルートディレクトリに ARCHITECTURE.md または .cursorrules (Cursorの場合) として配置し、AIに対して「この設計書に従ってリファクタリングを実行せよ」と指示してください。

ARCHITECTURE.md - Refactoring Specifications
1. Project Overview & Objective
本プロジェクト（jibunAI）の保守性と拡張性を向上させるため、アーキテクチャの再構築を行う。 現状の肥大化した main.py (Backend) および Pages.swift (iOS) を解体し、責務（Router/Service/Schema, MVVM）ごとに適切に分離することを目的とする。

2. Backend Architecture (FastAPI)
2.1 Directory Structure
backend/ 配下を以下のレイヤードアーキテクチャ構成とする。

Plaintext

backend/
├── main.py              # Application entry point, Middleware, Router registration
├── dependencies.py      # Common dependencies (e.g., get_current_user)
├── routers/             # Interface Layer (HTTP Handling)
│   ├── api.py           # Main router aggregator
│   ├── auth.py          # Auth endpoints
│   ├── chat.py          # Chat/Ask endpoints (Refactored from ask.py)
│   ├── voice.py         # Voice processing endpoints
│   ├── knowledge.py     # File import/query endpoints
│   └── user.py          # User management endpoints
├── services/            # Business Logic Layer
│   ├── chat_service.py      # RAG logic, Chat history
│   ├── voice_service.py     # FFMPEG, Gemini API integration
│   ├── knowledge_service.py # PDF/Image parsing, Vector DB operations
│   └── user_service.py      # DB CRUD for users
├── schemas/             # Data Transfer Objects (Pydantic Models)
│   ├── chat.py          # Request/Response models for Chat
│   ├── knowledge.py     # Request/Response models for Knowledge
│   └── common.py        # Shared models
└── database/            # Infrastructure Layer
    └── db.py            # DB connection, Session management
2.2 Implementation Rules
main.py
責務: アプリケーションの初期化、CORS等のミドルウェア設定、トップレベルの例外ハンドリング、app.include_router の実行のみを行う。

禁止事項: エンドポイントの直接定義、ビジネスロジックの記述。

routers/ (Interface Layer)
責務: HTTPリクエストの受け取り、パラメータ検証（Pydantic）、Service層の呼び出し、HTTPレスポンスの返却。

禁止事項: 複雑な条件分岐、外部APIへの直接コール、DBクエリの直接発行。

services/ (Business Logic Layer)
責務: アプリケーションのコアロジック。外部API (Gemini, OpenAI) の呼び出し、DB操作（Prisma/SQL）、データ加工。

依存: routers に依存してはならない。

schemas/ (DTO)
責務: Pydanticを用いた型定義。リクエストボディおよびレスポンスフォーマットの厳格化。

移動: main.py に存在するクラス定義（TextImportRequest 等）は全てここに移動する。

3. iOS Architecture (SwiftUI)
3.1 Directory Structure
jibunAI-ios/ 配下を機能単位（Feature-based）のMVVM構成とする。

Plaintext

jibunAI-ios/
├── App/
│   ├── jibunAI_iosApp.swift  # Entry point
│   └── AppStateManager.swift # Global state (Auth, User session)
├── Features/                 # Feature modules
│   ├── Chat/
│   │   ├── Views/
│   │   │   ├── ChatView.swift
│   │   │   └── Components/   # Chat specific UI components
│   │   └── ViewModels/
│   │       └── ChatViewModel.swift
│   ├── Knowledge/
│   │   ├── Views/
│   │   │   ├── KnowledgeView.swift
│   │   │   └── EditKnowledgeView.swift
│   │   └── ViewModels/
│   │       └── KnowledgeViewModel.swift (Refactored from DataViewModel)
│   ├── Voice/
│   │   ├── Views/
│   │   │   └── NoteView.swift
│   │   └── ViewModels/
│   │       └── VoiceNoteViewModel.swift
├── Shared/                   # Shared resources
│   ├── Components/           # Common UI (Buttons, Loaders)
│   ├── Models/               # API Data Models (Codable)
│   └── Services/             # API Client (Alamofire/URLSession wrapper)
└── Resources/                # Assets, Colors, Localizations
3.2 Implementation Rules
General
Pages.swiftの廃止: 単一ファイルに複数の struct View を定義することを禁止する。各Viewは独立したファイルに分割する。

View (SwiftUI)
責務: UIの描画とユーザー操作の検知。

禁止事項: API通信の直接記述、複雑な状態管理ロジック。

データフロー: ロジックは全て ViewModel 経由で行う。

ViewModel (ObservableObject)
責務: Viewの状態保持 (@Published)、API Serviceの呼び出し、データ加工。

命名規則: [FeatureName]ViewModel

Model
責務: APIレスポンスのマッピング（Codable）。

配置: 全体で利用するものは Shared/Models、特定の機能内のみで利用するものは Features/[Feature]/Models。