# Planet DJ School - レッスン予約管理システム

Planet DJ School のレッスン予約をExcel管理からWebアプリに置き換えるためのシステムです。

## 技術構成

- Next.js (App Router) + TypeScript
- Prisma + SQLite（本番はPostgreSQLへ移行しやすい設計）
- 管理者ログイン（シンプルなメール/パスワード認証、JWTセッションCookie）
- メール送信: Nodemailer + Gmailアプリパスワード
- リマインドメール: `/api/cron/reminder` を Vercel Cron から日次実行

## データモデル

- **Lesson**: レッスン名 / 日時 / 講師名 / 定員（既定3） / 会場（任意）
- **Booking**: レッスンID / 生徒名 / メールアドレス / 電話番号（任意） / リマインド送信済み日時
- **Admin**: 管理者メールアドレス / パスワードハッシュ

残り枠数はDBに保存せず、「定員 - 予約件数」を都度計算しています。

## 機能概要

### 生徒向け（トップページ）

- 開催予定のレッスンをカード表示（過去のレッスンは自動的に非表示）
- 残り枠がある場合のみ予約フォームへ遷移可能（満席はグレーアウトしクリック不可）
- 予約確定はサーバー側トランザクションで残り枠を再チェックしてから保存（同時予約による定員オーバーを防止）
- 予約完了後、Gmailから自動で確認メールを送信

### 管理者向け（`/admin`）

- ログインしないとアクセス不可（`middleware.ts` で保護）
- 全レッスン（過去分含む）の予約状況・生徒連絡先・予約人数・残り枠数を一覧表示

### リマインドメール

- 開催日の3日前になったレッスンの予約者へ自動でリマインドメールを送信
- `Booking.reminderSentAt` に送信済み日時を記録し、二重送信を防止
- `/api/cron/reminder` をVercel Cronから1日1回呼び出す想定（`CRON_SECRET` で保護）

## メール文面のカスタマイズ

`src/lib/emailTemplates.ts` に予約完了メール・リマインドメールの文面をまとめています。件名・本文を変更したい場合はこのファイルを編集してください。

## セットアップ（ローカル開発）

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
| --- | --- |
| `DATABASE_URL` | DB接続情報。ローカルは `file:./dev.db`（SQLite） |
| `GMAIL_USER` | 送信元Gmailアドレス |
| `GMAIL_APP_PASSWORD` | Gmailアプリパスワード（後述） |
| `MAIL_FROM_NAME` | メール送信者表示名 |
| `AUTH_SECRET` | 管理者セッション署名用のランダムな文字列（32文字以上推奨） |
| `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD` | `npm run prisma:seed` 実行時に作成される初期管理者アカウント |
| `CRON_SECRET` | リマインドバッチAPI (`/api/cron/reminder`) を保護するシークレット |
| `NEXT_PUBLIC_BASE_URL` | サイトのベースURL |

#### Gmailアプリパスワードの取得方法

通常のGmailパスワードではSMTP送信できないため、「アプリパスワード」を発行する必要があります。

1. 送信に使うGoogleアカウントで [Googleアカウント管理](https://myaccount.google.com/) を開く
2. 左メニューの「セキュリティ」を開く
3. 「Googleへのログイン」内の「2段階認証プロセス」を有効化する（未設定の場合は先に設定が必要）
4. 2段階認証を有効化後、同じ画面下部（または検索窓で「アプリパスワード」を検索）から「アプリ パスワード」を開く
5. アプリ名（例: `Planet DJ School`）を入力して「作成」をクリック
6. 表示された16桁のパスワード（スペースなし）を `GMAIL_APP_PASSWORD` に設定する
7. `GMAIL_USER` にはこのGoogleアカウントのメールアドレスを設定する

### 3. データベースの作成・初期データ投入

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

これで初期管理者アカウント（`ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`）とサンプルレッスン（Lesson1〜5）が作成されます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で生徒向けページ、[http://localhost:3000/admin](http://localhost:3000/admin) で管理者ページにアクセスできます。

## Vercelへのデプロイ手順

### 1. データベースについて（重要）

Vercelのサーバーレス環境ではファイルシステムが実行ごとにリセットされるため、SQLiteファイルは本番運用に使用できません。本番では以下のいずれかを推奨します。

- [Vercel Postgres](https://vercel.com/storage/postgres) / [Neon](https://neon.tech) / [Supabase](https://supabase.com) など、PostgreSQLのホスティングサービスを利用する

移行手順:

1. `prisma/schema.prisma` の `datasource db` を以下のように変更する

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. `DATABASE_URL` にPostgreSQLの接続文字列を設定する
3. `npx prisma migrate deploy` で本番DBにマイグレーションを適用する

（データモデル自体はSQLite/PostgreSQL間で変更不要です）

### 2. Vercelプロジェクトの作成

1. GitHubリポジトリをVercelにインポートする
2. 「Environment Variables」に `.env.example` に記載の変数（`DATABASE_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM_NAME`, `AUTH_SECRET`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`）をすべて設定する
3. デプロイを実行する
4. デプロイ後、ローカルから本番DBに対して以下を1回だけ実行し、マイグレーションと初期管理者アカウントを作成する

   ```bash
   DATABASE_URL="<本番のURL>" npx prisma migrate deploy
   DATABASE_URL="<本番のURL>" npm run prisma:seed
   ```

### 3. Vercel Cronの設定（リマインドメール）

このリポジトリの `vercel.json` に、毎日 UTC 0:00（日本時間 朝9:00）に `/api/cron/reminder` を呼び出す設定を含めています。

```json
{
  "crons": [
    { "path": "/api/cron/reminder", "schedule": "0 0 * * *" }
  ]
}
```

Vercelは環境変数 `CRON_SECRET` が設定されていると、Cronからのリクエストに自動的に `Authorization: Bearer <CRON_SECRET>` ヘッダーを付与します。デプロイ時に `CRON_SECRET` を必ず設定してください（設定方法はVercelの [Cron Jobs](https://vercel.com/docs/cron-jobs) ドキュメントを参照）。

手動でリマインドバッチを実行して動作確認したい場合は、以下のようにcrontab上のURLを直接呼び出すこともできます。

```bash
curl "https://your-domain.vercel.app/api/cron/reminder?secret=<CRON_SECRET>"
```

## ディレクトリ構成（抜粋）

```
prisma/
  schema.prisma        # Lesson / Booking / Admin のデータモデル
  seed.ts               # 初期管理者・サンプルレッスンの投入
src/
  app/
    page.tsx             # 生徒向けトップページ（レッスン一覧）
    lessons/[id]/book/    # 予約フォーム
    admin/                # 管理者ページ（ログイン / 予約状況一覧）
    api/
      bookings/            # 予約作成API（トランザクションで枠を再チェック）
      cron/reminder/        # 3日前リマインドメール送信バッチ
      admin/login|logout/   # 管理者ログイン・ログアウト
  lib/
    prisma.ts             # Prismaクライアント
    session.ts / auth.ts  # 管理者セッション（JWT Cookie）
    password.ts           # パスワードハッシュ化・検証
    mailer.ts              # Nodemailer(Gmail)送信処理
    emailTemplates.ts      # メール文面テンプレート
  middleware.ts           # /admin配下のアクセス制御
```
