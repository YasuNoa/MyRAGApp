import React from "react";

export default function TokushoPage() {
  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "40px 20px", 
      fontFamily: "var(--font-sans)",
      color: "var(--text-primary)"
    }}>
      <h1 style={{ marginBottom: "30px", fontSize: "24px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>特定商取引法に基づく表記</h1>
      
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row label="販売業者">
            小川泰平<br/>
            <span style={{ fontSize: "0.8em", color: "var(--text-secondary)" }}>※請求があった場合、遅滞なく開示いたします。</span>
          </Row>
          <Row label="代表責任者">
             小川泰平
          </Row>
          <Row label="所在地">
            請求があった場合には遅滞なく開示します
          </Row>
          <Row label="電話番号">
            請求があった場合には遅滞なく開示します<br/>
          </Row>
          <Row label="メールアドレス">
            mbdeveloperyasu@gmail.com
          </Row>
          <Row label="販売価格">
            各プランの申し込みページに表示された金額（表示価格/消費税込）とします。
          </Row>
          <Row label="商品代金以外の必要料金">
            インターネット接続料金その他の電気通信回線の通信に関する費用はお客様にて別途ご用意いただく必要があります（金額は、お客様が契約した各事業者が定める通り）。
          </Row>
          <Row label="支払方法">
            クレジットカード決済
          </Row>
          <Row label="支払時期">
            ・月額プラン：初回申し込み時、および翌月以降毎月同日に請求されます。<br/>
            ・年額プラン：初回申し込み時、および翌年同日に請求されます。<br/>
            ・都度課金：購入手続き完了時に即時決済されます。
          </Row>
          <Row label="商品の引渡時期">
            決済完了後、直ちにご利用いただけます。
          </Row>
          <Row label="返品・キャンセルについて">
            サービスの性質上、返品・返金はお受けしておりません。<br/>
            解約は設定画面よりいつでも行っていただけます。解約後も次回更新日まではサービスをご利用いただけます。
          </Row>
          <Row label="動作環境">
            推奨ブラウザ：Google Chrome, Safari, Edge, Firefox の最新版<br/>
            その他、インターネットに接続できる環境が必要です。
          </Row>
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
      <th style={{ 
        padding: "15px 10px", 
        textAlign: "left", 
        width: "30%", 
        fontWeight: "bold",
        backgroundColor: "rgba(0,0,0,0.02)"
      }}>
        {label}
      </th>
      <td style={{ padding: "15px 10px" }}>
        {children}
      </td>
    </tr>
  );
}
