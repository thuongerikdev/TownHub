using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MimeKit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.Email
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
        public Task TestSend(string to);
        //public Task<ResponeDto> SendInvoiceEmail(int userID);
        public Task SendVerificationEmail(int userId, string email, string verificationToken);
        Task SendPasswordResetEmail(int userId, string email, string resetToken);


    }
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        private readonly string _baseUrl;

        public EmailService( IOptions<EmailSettings> emailSettings, IConfiguration configuration)
        {
            _emailSettings = emailSettings.Value;

            _baseUrl = configuration["Kestrel:Endpoints:Https:Url"]
                    ?? configuration["Kestrel:Endpoints:Http:Url"]
                    ?? "https://localhost:5001"; // Default fallback
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_emailSettings.DisplayName, _emailSettings.Mail));
            email.To.Add(new MailboxAddress(to, to));
            email.Subject = subject;
            var password = _emailSettings.Password.Trim();

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = body
            };
            email.Body = bodyBuilder.ToMessageBody();

            using var smtp = new MailKit.Net.Smtp.SmtpClient();
            try
            {
                // Specify StartTls explicitly
                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.Mail, password);
                await smtp.SendAsync(email);
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }



        public async Task TestSend(string to)
        {
            var subJect = "Activate Email";
            var body = "Your Tournament Has been Activated ";
            await SendEmailAsync(to, subJect, body);
        }

        public async Task SendCancelEmail(string to, int orderID, DateTime createAt)
        {
            string subject = "Thông báo hủy đơn hàng";
            string body = $@"
                        <h2>Thông báo từ hệ thống</h2>
                        <p>Đơn hàng 
            {orderID} của bạn đã bị hủy tự động vì quá 30 phút kể từ khi đến hẹn  ({createAt}).</p>
                        <p>Vui lòng đặt lại lịch nếu cần.</p>";
            await SendEmailAsync(to, subject, body);
        }



        public async Task SendVerificationEmail(int userId, string email, string verificationToken)
        {
            // Chủ đề: ứng dụng xem phim, nhấn mạnh bảo mật
            var subject = "Mã xác minh tài khoản xem phim của bạn";

            // HTML email (dark theme, nhấn mạnh token)
            var year = DateTime.UtcNow.Year;
            var appName = "FZ Movies"; // đổi tên thương hiệu nếu bạn muốn

            var bodyBuilder = new BodyBuilder
            {
                // Bản thuần văn bản (phòng trường hợp client chặn HTML)
                TextBody =
                            $@"Chào bạn,

                    Đây là mã xác minh tài khoản {appName} của bạn:

                    {verificationToken}

                    Hãy mở ứng dụng/website và nhập mã ở bước Xác minh email.
                    Nếu bạn không yêu cầu, vui lòng bỏ qua email này.

                    © {year} {appName}.",
                HtmlBody = $@"
                    <!DOCTYPE html>
                    <html lang=""vi"">
                    <head>
                      <meta charset=""UTF-8"">
                      <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
                      <title>{subject}</title>
                      <style>
                        /* Reset cơ bản */
                        body, p, h1, h2, h3, a {{ margin:0; padding:0; }}
                        body {{
                          background-color: #0b0f17;
                          color: #d6e0ff;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                          -webkit-font-smoothing: antialiased;
                          -moz-osx-font-smoothing: grayscale;
                          padding: 24px;
                        }}
                        .container {{
                          max-width: 640px;
                          margin: 0 auto;
                          background: #0f1524;
                          border-radius: 12px;
                          overflow: hidden;
                          box-shadow: 0 8px 28px rgba(0,0,0,.45);
                          border: 1px solid rgba(255,255,255,.06);
                        }}
                        .header {{
                          background: radial-gradient(120% 120% at 20% 0%, #1b2340 0%, #0f1524 60%, #0b0f17 100%);
                          padding: 28px 28px 20px 28px;
                          border-bottom: 1px solid rgba(255,255,255,.06);
                        }}
                        .brand {{
                          display: flex; align-items: center; gap: 12px;
                          color: #E5ECFF; text-decoration: none;
                        }}
                        .brand-logo {{
                          width: 40px; height: 40px; border-radius: 10px;
                          background: linear-gradient(135deg, #7aa8ff, #5b86ff);
                          display:flex; align-items:center; justify-content:center;
                          font-weight: 800; font-size: 18px; color:#0b0f17;
                          box-shadow: 0 6px 18px rgba(91,134,255,.35);
                        }}
                        .brand-name {{
                          font-size: 18px; font-weight: 700; letter-spacing: .3px;
                        }}
                        .title {{
                          margin-top: 16px;
                          font-size: 22px;
                          font-weight: 700;
                          color: #ffffff;
                        }}
                        .content {{ padding: 24px 28px 28px 28px; }}
                        .lead {{
                          line-height: 1.6; color: #c9d6ff; font-size: 15px;
                          margin-bottom: 18px;
                        }}
                        .token-wrap {{
                          margin: 22px 0;
                          background: #0b1020;
                          border: 1px dashed rgba(123, 163, 255, 0.5);
                          border-radius: 12px;
                          padding: 18px;
                          text-align: center;
                        }}
                        .token-label {{
                          font-size: 12px; color: #8ea8ff; letter-spacing: .12em; text-transform: uppercase;
                        }}
                        .token {{
                          margin-top: 10px;
                          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                          font-weight: 800;
                          font-size: 28px;
                          letter-spacing: .12em;
                          color: #ffffff;
                          text-shadow: 0 0 18px rgba(91,134,255,.35);
                          word-break: break-word;
                        }}
                        .hint {{
                          font-size: 13px; color: #9cb2ff; opacity: .9; margin-top: 6px;
                        }}
                        .divider {{
                          height: 1px; background: rgba(255,255,255,.06); margin: 22px 0;
                        }}
                        .meta {{ font-size: 12px; color: #9aaad6; line-height: 1.6; }}
                        .footer {{
                          padding: 16px 24px 22px 24px; text-align: center; color: #8b99c9; font-size: 12px;
                        }}
                        .links a {{ color: #9cb2ff; text-decoration: none; }}
                        .links a:hover {{ text-decoration: underline; }}
                      </style>
                    </head>
                    <body>
                      <div class=""container"">
                        <div class=""header"">
                          <a class=""brand"" href=""#"">
                            <div class=""brand-logo"">FM</div>
                            <div class=""brand-name"">{appName}</div>
                          </a>
                          <div class=""title"">Xác minh email của bạn</div>
                        </div>

                        <div class=""content"">
                          <p class=""lead"">
                            Chào bạn, cảm ơn bạn đã đăng ký <strong>{appName}</strong> — nền tảng xem phim trực tuyến với trải nghiệm mượt mà và đề xuất thông minh.
                          </p>
                          <p class=""lead"">
                            Để hoàn tất quá trình đăng ký, vui lòng <strong>nhập mã xác minh</strong> dưới đây trong màn hình xác thực email của ứng dụng/website:
                          </p>

                          <div class=""token-wrap"">
                            <div class=""token-label"">Mã xác minh</div>
                            <div class=""token"">{verificationToken}</div>
                            <div class=""hint"">Không chia sẻ mã này cho bất kỳ ai.</div>
                          </div>

                          <div class=""divider""></div>

                          <p class=""meta"">
                            Nếu bạn <em>không</em> thực hiện đăng ký này, vui lòng bỏ qua email hoặc phản hồi tới
                            <a href=""mailto:support@fzmovies.app"">support@fzmovies.app</a>.
                          </p>
                        </div>

                        <div class=""footer"">
                          <div>© {year} {appName}. Mọi quyền được bảo lưu.</div>
                          <div class=""links"">
                            <a href=""#"">Điều khoản</a> · <a href=""#"">Chính sách bảo mật</a>
                          </div>
                        </div>
                      </div>
                    </body>
                    </html>"
            };

            var emailMessage = new MimeMessage();
            emailMessage.From.Add(new MailboxAddress(_emailSettings.DisplayName, _emailSettings.Mail));
            emailMessage.To.Add(new MailboxAddress(email, email));
            emailMessage.Subject = subject;
            emailMessage.Body = bodyBuilder.ToMessageBody();

            using var smtp = new MailKit.Net.Smtp.SmtpClient();
            try
            {
                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.Mail, _emailSettings.Password.Trim());
                await smtp.SendAsync(emailMessage);
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }

        public async Task SendPasswordResetEmail(int userId, string email, string resetToken)
        {
            var subject = "Đặt lại mật khẩu tài khoản FZ Movies";
            var year = DateTime.UtcNow.Year;
            var appName = "FZ Movies";

            var bodyBuilder = new BodyBuilder
            {
                TextBody =
                        $@"Chào bạn,

                Bạn vừa yêu cầu đặt lại mật khẩu {appName}.
                Mã đặt lại của bạn:

                {resetToken}

                Mã hết hạn sau 15 phút. Nếu không phải bạn, hãy bỏ qua email này.

                © {year} {appName}.",

                HtmlBody = $@"<!doctype html><html><body style=""font-family:Arial,Helvetica,sans-serif"">
                <div style=""max-width:640px;margin:auto;background:#0f1524;color:#d6e0ff;padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,.06)"">
                  <h2>Đặt lại mật khẩu</h2>
                  <p>Bạn vừa yêu cầu đặt lại mật khẩu <b>{appName}</b>.</p>
                  <div style=""margin:16px 0;padding:16px;border:1px dashed #7ba3ff;border-radius:10px;background:#0b1020;text-align:center"">
                    <div style=""font-size:12px;color:#9cb2ff;letter-spacing:.16em;text-transform:uppercase"">Mã đặt lại</div>
                    <div style=""margin-top:8px;font-weight:800;font-size:26px;color:#fff;letter-spacing:.12em"">{resetToken}</div>
                    <div style=""font-size:12px;color:#9cb2ff;margin-top:6px"">Hết hạn sau 15 phút</div>
                  </div>
                  <p>Nếu không phải bạn, hãy bỏ qua email này.</p>
                  <hr style=""border:none;height:1px;background:rgba(255,255,255,.06);margin:18px 0""/>
                  <small>© {year} {appName}. Mọi quyền được bảo lưu.</small>
                </div>
                </body></html>"
            };

            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(_emailSettings.DisplayName, _emailSettings.Mail));
            msg.To.Add(new MailboxAddress(email, email));
            msg.Subject = subject;
            msg.Body = bodyBuilder.ToMessageBody();

            using var smtp = new MailKit.Net.Smtp.SmtpClient();
            try
            {
                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.Mail, _emailSettings.Password.Trim());
                await smtp.SendAsync(msg);
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }
    }
}
