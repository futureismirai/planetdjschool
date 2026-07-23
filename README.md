# Planet DJ School - レッスン予約管理システム

Planet DJ School のレッスン予約をExcel管理からWebアプリに置き換えるためのシステムです。

## 技術構成

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL
- 管理者ログイン（シンプルなメール/パスワード認証、JWTセッションCookie）
- メール送信: Nodemailer + Gmailアプリパスワード
- リマインドメール: `/api/cron/reminder` を Vercel Cron から日次実行

## データモデル

- **Lesson**: レッスン名 / 日時 / 講師名 / 定員（既定3） / 会場（任意）
- **Booking**: レッスンID / 生徒名 / メールアドレス（任意） / 電話番号（任意） / リマインド送信済み日時
- **Admin**: 管理者メールアドレス / パスワードハッシュ
- **TrialSession**: 体験会の日時 / 参加講師 / 定員（既定3、管理者専用・生徒には非表示）
- **TrialParticipant**: 体験会ID / 生徒名 / メールアドレス（必須） / 備考 / リマインド送信済み日時

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
- `/admin/lessons` でレッスンの追加・編集・削除が可能（レッスン名・日時・講師名・定員・場所）
- `/admin/trial` で体験会の参加者を管理（生徒には非公開。1回最大3名、生徒名・メールアドレス(必須)・備考を手入力で登録。登録時と開催3日前に確認メールを自動送信）

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
| `DATABASE_URL` | PostgreSQLの接続文字列（後述の手順で取得） |
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

PostgreSQLのデータベースが必要です（本番用に作成する場合は次章「Vercelへのデプロイ手順」を先に見てください。同じデータベースをローカル開発でもそのまま使えます）。

`.env` の `DATABASE_URL` を設定したら、以下を実行してテーブルと初期データを作成します。

```bash
npx prisma db push
npm run prisma:seed
```

これで初期管理者アカウント（`ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`）とサンプルレッスン（Lesson1〜5）が作成されます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で生徒向けページ、[http://localhost:3000/admin](http://localhost:3000/admin) で管理者ページにアクセスできます。

## Vercelへのデプロイ手順

### 1. データベースを用意する（必須）

Vercelは実行のたびにファイルシステムがリセットされるため、SQLiteのようなファイル保存型のデータベースは使えません。**必ずPostgreSQLのデータベースを用意してください。**

一番手軽なのは、Vercelのダッシュボードから数クリックで作れる方法です。

1. Vercelの対象プロジェクトを開く
2. 上部メニューの「Storage」タブを開く
3. 「Create Database」→「Postgres」（Neon提供）を選択して作成する
4. 作成後、「Connect Project」でこのプロジェクトに接続する（自動で環境変数が追加されます）
5. 追加された環境変数の中に `DATABASE_URL` という名前のものがあるか確認する
   - もし `POSTGRES_URL` など別名でしか追加されない場合は、「Environment Variables」の画面でその値をコピーし、`DATABASE_URL` という名前の変数としても追加してください（このアプリは `DATABASE_URL` という名前しか見ません）

Neon / Supabase など他のPostgreSQLサービスを既にお持ちの場合は、その接続文字列を `DATABASE_URL` に設定するだけでも構いません。

### 2. Vercelプロジェクトの環境変数を設定する

「Settings」→「Environment Variables」で、以下をすべて設定してください（`DATABASE_URL` は上の手順で設定済みのはずです）。

| 変数名 | 設定する値 |
| --- | --- |
| `DATABASE_URL` | 上の手順1で用意したPostgreSQLの接続文字列 |
| `GMAIL_USER` | 送信に使うGmailアドレス |
| `GMAIL_APP_PASSWORD` | Gmailアプリパスワード（このREADME内「Gmailアプリパスワードの取得方法」を参照） |
| `MAIL_FROM_NAME` | メール送信者名（例: `Planet DJ School`） |
| `AUTH_SECRET` | ランダムな文字列（32文字以上。パスワード生成ツールなどで作成） |
| `ADMIN_INITIAL_EMAIL` | 管理者ログインに使うメールアドレス |
| `ADMIN_INITIAL_PASSWORD` | 管理者ログインに使うパスワード |
| `CRON_SECRET` | ランダムな文字列（リマインドバッチ保護用） |
| `NEXT_PUBLIC_BASE_URL` | 例: `https://your-domain.vercel.app` |

設定後、「Deployments」から再デプロイしてください。

### 3. データベースの初期化（1回だけ必要）

環境変数を設定しただけではデータベースの中身（テーブル）が空のままなので、1回だけ初期化が必要です。方法は2つあります。

**方法A: ブラウザでURLを開くだけ（一番簡単）**

デプロイが完了したら、ブラウザで以下のURLを開いてください（`your-domain` とURL末尾の `secret` の値は実際のものに置き換えてください。`secret` には環境変数 `CRON_SECRET` に設定した値を入れます）。

```
https://your-domain.vercel.app/api/setup?secret=<CRON_SECRETの値>
```

`{"ok":true,...}` のような表示が出れば成功です。テーブル作成と初期データ投入が行われます。このURLは何度開いても安全です（重複してデータが増えることはありません）。

**方法B: パソコンからコマンドを実行する**

技術的な方法でも構わない場合は、パソコンでこのリポジトリを開いて以下を実行してください（`DATABASE_URL` の値は「1. データベースを用意する」の接続文字列）。

```bash
DATABASE_URL="<接続文字列>" npx prisma db push
DATABASE_URL="<接続文字列>" npm run prisma:seed
```

### 4. Vercel Cronの設定（リマインドメール）

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
