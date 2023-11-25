import {Env} from '../types/env';
import {MailParams} from '../types/mailBox';

export class SendMailService {
  private env: Env;
  private readonly autoReplyTemplate: string = `
    <!-- Desktop Outlook chokes on web font references and defaults to Times New Roman, so we force a safe fallback font. -->
    <!--[if mso]>
      <style>
          * { font-family: sans-serif !important; }
      </style>
    <![endif]-->
    
    <!-- All other clients get the webfont reference; some will render the font and others will silently fail to the fallbacks. -->
    <!--[if !mso]><!-->
    <link
      href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.0/packages/wanted-sans/fonts/webfonts/static/split/WantedSans.min.css"
      type="text/css">
    <!--<![endif]-->
    
    <div
      style="padding: 10px; color: #444444; font-size: 12px; line-height: 18px; font-family: 'Wanted Sans', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;">
      <div style="color: #b5b5b5;">## 회신을 보내실 경우 이 줄 위에 내용을 입력해 주세요 ##</div>
      <div style="color: #b5b5b5;">## In replies all text above this line is added to the ticket ##</div>
    
      <p dir="ltr"></p>
    
      <div style="margin-top: 25px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tbody>
            <tr>
              <td width="100%" style="padding: 15px 0; border-top: 1px dotted #c5c5c5;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;"
                  role="presentation">
                  <tbody>
                    <tr>
                      <td valign="top" style="padding: 0 15px 0 15px; width: 40px;">
                        <img width="40" height="40" alt=""
                          style="height: auto; line-height: 100%; outline: none; text-decoration: none; border-radius: 5px;"
                          src="https://mailjeteu.zendesk.com/images/2016/default-avatar-80.png" data-bit="iit" />
                      </td>
                      <td width="100%" style="padding: 0; margin: 0;" valign="top">
                        <p style="font-size: 15px; line-height: 18px; margin-bottom: 0; margin-top: 0; padding: 0; color: #1b1d1e;"
                          dir="ltr"><strong>SpaceWak Support</strong></p>
                        <p style="font-size: 13px; line-height: 25px; margin-bottom: 15px; margin-top: 0; padding: 0; color: #bbbbbb;"
                          dir="ltr">{{var:send_date:""}} (KST)</p>
                        <div dir="auto" style="color: #2b2e2f; line-height: 22px; margin: 15px 0;">
                          <p dir="ltr" style="color: #2b2e2f; line-height: 22px; margin: 15px 0;">고객님의
                            문의(#{{var:ticket_no:""}})가 성공적으로 접수되었습니다.<br />빠른 시간 내에 답변 드리겠습니다.</p>
                          <p dir="ltr" style="color: #2b2e2f; line-height: 22px; margin: 15px 0;">스페이스왁 서비스를 이용해 주셔서
                            감사합니다.</p>
                          <p dir="ltr"></p>
                          <p dir="ltr" style="color: #b5b5b5;">이 메시지는 문의 접수 완료시에 안내되는 자동화 메시지입니다. 추가하실 내용이 있으시면 답장으로 편하게
                            연락 주시기 바랍니다.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    
      <div style="color: #9e9e9e; margin: 10px 0 14px 0; padding-top: 10px; border-top: 1px solid #eeeeee;">
        This email delivered by
        <a href="http://www.mailjet.com" style="color: black;" target="_blank">
          <span class="il">Mailjet</span>
        </a> and <a href="http://www.cloudflare.com" style="color: black;" target="_blank">
          <span class="il">Cloudflare</span>
        </a>
      </div>
    </div>
  `;

  constructor(env: Env) {
    this.env = env;
  }

  public async replyMail(data: MailParams): Promise<boolean> {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(
          `${this.env.MAILJET_API_KEY}:${this.env.MAILJET_API_SECRET}`
        )}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: data.from.address,
              Name: 'SpaceWak Support',
            },
            To: [
              {
                Email: data.to.address,
              },
            ],
            Subject: `[SpaceWak] #${data.id}: ${data.subject}`,
            TextPart: `고객님의 문의(#${data.id})가 성공적으로 접수되었습니다.
  빠른 시간 내에 답변 드리겠습니다.
  
  스페이스왁 서비스를 이용해 주셔서 감사합니다.`,
            HTMLPart: this.autoReplyTemplate,
            TemplateLanguage: true,
            Variables: {
              ticket_no: data.id,
              send_date: new Date().toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              }),
            },
          },
        ],
      }),
    });

    console.log(await response.json());

    return response.ok;
  }
}
