export function contractEmailHtml({ intro, inlineNotice, printHtml }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <p>${intro}</p>
      ${
        inlineNotice
          ? `<p style="color:#555;"><em>${inlineNotice}</em></p>`
          : ""
      }
      <hr/>
      <div>${printHtml}</div>
      <hr/>
      <p style="font-size:12px;color:#666;">
        This email contains confidential information intended for the recipients only.
      </p>
    </div>
  `;
}
