package api

import (
	"html"
	"strings"
)

// emailRow is a single label/value line shown in a details table.
type emailRow struct {
	Label string
	Value string
}

// detailTable renders rows as an email-safe, zebra-striped two-column table.
// Empty values are skipped. Values are HTML-escaped.
func detailTable(rows []emailRow) string {
	var b strings.Builder
	b.WriteString(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;width:100%;border:1px solid #ECECEC;border-radius:10px;overflow:hidden;">`)
	i := 0
	for _, r := range rows {
		if strings.TrimSpace(r.Value) == "" {
			continue
		}
		bg := "#ffffff"
		if i%2 == 1 {
			bg = "#FAF8F6"
		}
		b.WriteString(`<tr style="background:` + bg + `;">`)
		b.WriteString(`<td style="padding:11px 16px;font-size:12px;color:#8A8A8A;font-weight:bold;text-transform:uppercase;letter-spacing:0.4px;width:140px;vertical-align:top;border-bottom:1px solid #F0EEEA;">` + html.EscapeString(r.Label) + `</td>`)
		b.WriteString(`<td style="padding:11px 16px;font-size:14px;color:#222222;font-weight:600;vertical-align:top;border-bottom:1px solid #F0EEEA;">` + html.EscapeString(r.Value) + `</td>`)
		b.WriteString(`</tr>`)
		i++
	}
	b.WriteString(`</table>`)
	return b.String()
}

// emailShell wraps body HTML in a branded, email-client-safe layout
// (table-based, inline styles) used by every outgoing email.
func emailShell(heading, intro, bodyHTML, footerNote string) string {
	introHTML := ""
	if strings.TrimSpace(intro) != "" {
		introHTML = `<p style="margin:0 0 18px;color:#5A5A5A;font-size:14px;line-height:22px;">` + html.EscapeString(intro) + `</p>`
	}
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F1EE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F1EE;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;border:1px solid #E8E6E1;">
        <tr><td style="background:#E2231A;padding:22px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="color:#ffffff;font-size:21px;font-weight:bold;letter-spacing:0.5px;">RPK Food Trading</td>
            <td align="right" style="color:#FFD9D6;font-size:12px;font-weight:bold;">Dubai · Worldwide</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;background:#1F2A44;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:30px 28px 6px;">
          <h1 style="margin:0;font-size:20px;font-weight:bold;color:#1A1A1A;">` + html.EscapeString(heading) + `</h1>
        </td></tr>
        <tr><td style="padding:14px 28px 26px;">
          ` + introHTML + bodyHTML + `
        </td></tr>
        <tr><td style="background:#FAFAF8;border-top:1px solid #EFEDE7;padding:20px 28px;">
          <p style="margin:0;color:#9A9A9A;font-size:12px;line-height:18px;">` + html.EscapeString(footerNote) + `</p>
          <p style="margin:10px 0 0;color:#BCBAB4;font-size:11px;line-height:16px;">RPK FOR FOOD TRADING CO. L.L.C · 1E5, 1st Floor, Al Fardan Building, Al Mankhool, Dubai, UAE</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
