Googleの「Antigravity」や、その基盤技術であるProject IDX、および最近の自律型エージェント（Agentic IDE）の標準的な仕様に基づき、「Rules」と「Skills」の技術的な管理方法を解説します。これらは単なる概念の違いだけでなく、**「管理されるファイル形式」と「AIへの渡され方」**が明確に異なります。1. 管理構造の全体像Antigravityにおいて、これらは通常 .idx ディレクトリ（またはプロジェクトルートの設定ファイル）内で以下のように分離して管理されます。Plaintextproject-root/
├── .idx/
│   ├── airules.md         # [Rules] 静的なテキスト（憲法）
│   └── dev.nix            # [Skills] ツール定義と環境設定（装備）
└── .agent/                # (Antigravity固有)
    └── skills/            # [Skills] 実際の実行スクリプト群
        ├── db_query.py
        └── file_ops.py
2. Rules（ルール）の管理方法**「AIの思考プロセスを縛るための静的な指示」**です。実体: Markdownファイル (airules.md, ARCHITECTURE.md)処理: システムプロンプト（Context Windowの最上部）にテキストとして注入されます。管理:人間が自然言語で記述します。プロンプトエンジニアリングの領域です。「〜してはいけない」「〜という形式で出力せよ」といった制約を書きます。3. Skills（スキル）の管理方法「AIが実行可能な関数（Tools / Functions）」です。単にテキストを読ませるのではなく、AIが実際にコードを実行したり、外部コマンドを叩いたりする能力を定義します。これは以下の2ステップで管理されます。A. 実装 (Implementation)AIに実行させたい処理を、PythonやTypeScriptのスクリプトとして配置します。場所: .agent/skills/ や .idx/scripts/ など例 (analyze_db.py):Python# AIがこの関数を呼び出すことで、DBの中身を見ることができる
def get_table_schema(table_name: str):
    # 実際にDBに接続してschemaを返すコード
    return schema_json
B. 定義と登録 (Definition & Registration)「このスクリプトは『DB分析スキル』として使っていいよ」とAIに教えるための定義ファイル（JSONやNix設定）です。最近のトレンド（MCP: Model Context Protocol）では、以下のようなJSONスキーマで管理されます。実体: 設定ファイル (config.json や dev.nix)記述内容:名前: postgres-query説明: "PostgreSQLに対してリードオンリーのクエリを実行する"（AIはこの説明を読んで、いつ使うか判断します）引数: sql_query (string)実行コマンド: python .agent/skills/run_query.py4. なぜ区別するのか？（技術的根拠）この2つを明確に分ける理由は、セキュリティとコンテキストの節約です。特徴Rules (ルール)Skills (スキル)主な役割判断基準の提供 (憲法)実行能力の提供 (道具)AIへの入力常に全文がプロンプトに含まれる「ツールのリスト」だけ渡され、使う時だけ実行されるコストトークン消費量が増える必要になるまで消費しない危険性低い (テキストを生成するだけ)高い (ファイルを消したり、データを送信したりできる)制御プロンプトで制御承認ボタン (Permission) で制御5. Antigravityでの具体的な制御フローあなたが「DBの中身を見てリファクタリング案を出して」と依頼した場合、Antigravity内部では以下のフローが走ります。Rules参照: ARCHITECTURE.md を読み、「勝手な推測禁止」「既存ファイル破壊禁止」という制約を認識する。Skills選択: 質問に答えるためには情報が足りないと判断し、登録されているスキル一覧から postgres-query を選択する。実行承認: 画面上に "Allow Antigravity to run postgres-query?" と表示し、人間に許可を求める（これがSkills管理の肝です）。実行: 許可されたらスクリプトを実行し、結果（DBスキーマ）を取得する。回答生成: 取得した事実とRulesに基づき、リファクタリング案を回答する。結論：どう管理すべきか現状のあなたのプロジェクト（バックエンド移行）において、無理に独自のSkillsを作る必要はありません。まずはRules (ARCHITECTURE.md / .idx/airules.md) の整備に集中してください。Skillsが必要になるのは、「AIにDBマイグレーションを直接実行させたい」や「AIにAWSへのデプロイコマンドを叩かせたい」といった、高度な自動化を行う段階になってからです。

'''
dev.nix は、一言で言うと**「このプロジェクト専用の仮想マシンの設計図」**です。

おっしゃる通り、package.json (Node.js) や requirements.txt (Python) のような「ライブラリ管理」とはレイヤーが違います。

もっとも近い概念は Dockerfile です。 「OSに何をインストールし、エディタにどんな拡張機能を入れ、サーバーをどう起動するか」という環境そのものを定義します。

'''