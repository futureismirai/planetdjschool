// Googleフォームの回答が蓄積されるスプレッドシート。
// https://docs.google.com/spreadsheets/d/1O7-zhGA-1ovrOQREGLDXJvSLBY9HqF2p-fENVTaH_LQ/edit
const SPREADSHEET_ID = "1O7-zhGA-1ovrOQREGLDXJvSLBY9HqF2p-fENVTaH_LQ";
// 回答が入っているタブのgid。タブを右クリック→URLを確認すると "#gid=xxxx" の形で確認できる。
// フォームの回答が別のタブに入っている場合はここを変更してください。
const SHEET_GID = "0";

export type FormResponseField = { label: string; value: string };

export type FormResponse = {
  rowIndex: number;
  email: string | null;
  fields: FormResponseField[];
};

/** シンプルなCSVパーサー(ダブルクォート・カンマ・改行を含むセルに対応)。 */
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // \r\n の \r は無視(次の\nで改行として処理される)
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 列見出しの中から「メールアドレス」を尋ねている列を探す(質問文が変わっても対応できるよう部分一致で判定)。 */
function findEmailColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => /mail/i.test(h) || h.includes("メール"));
}

/**
 * Googleフォームの回答スプレッドシートをCSVとして取得しパースする。
 * 列見出し(質問文)をそのままラベルとして扱うため、フォームの質問内容が変更されても
 * コードの変更なしに反映される。
 * スプレッドシート側は「リンクを知っている全員が閲覧可能」に共有しておく必要がある。
 */
async function fetchCsv(url: string): Promise<Response> {
  return fetch(url, { cache: "no-store" });
}

export async function fetchFormResponses(): Promise<FormResponse[]> {
  const urlWithGid = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
  let res = await fetchCsv(urlWithGid);

  // 指定したgidのタブが存在しない場合(400)は、gid指定なし(先頭のタブ)で再試行する。
  if (!res.ok && res.status === 400) {
    const urlWithoutGid = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
    res = await fetchCsv(urlWithoutGid);
  }

  if (!res.ok) {
    throw new Error(
      `スプレッドシートの取得に失敗しました(status: ${res.status})。共有設定をご確認ください。`
    );
  }

  const csvText = await res.text();
  if (csvText.trim().startsWith("<")) {
    throw new Error(
      "スプレッドシートを取得できませんでした。共有設定を「リンクを知っている全員が閲覧可能」に変更してください。"
    );
  }

  const rows = parseCsv(csvText).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return [];

  const headers = rows[0];
  const emailColIndex = findEmailColumnIndex(headers);

  return rows.slice(1).map((row, i) => {
    const fields: FormResponseField[] = headers.map((label, colIndex) => ({
      label,
      value: row[colIndex] ?? "",
    }));
    const rawEmail = emailColIndex >= 0 ? row[emailColIndex] : undefined;
    const email = rawEmail?.trim() ? rawEmail.trim().toLowerCase() : null;
    return { rowIndex: i, email, fields };
  });
}
