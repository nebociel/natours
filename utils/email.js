import SibApiV3Sdk from '@getbrevo/brevo';
import dotenv from 'dotenv';
import pug from 'pug';

dotenv.config({ path: './config.env' });

const Brevo = new SibApiV3Sdk.TransactionalEmailsApi();

// Configure API key authorization: apiKey
const apiKey = Brevo.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

export default class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = { name: 'Akash', email: process.env.EMAIL_FROM };
  }

  async send(template, subject) {
    try {
      // Set email parameters
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = await this.renderPugTemplate(template);
      sendSmtpEmail.sender = this.from;
      sendSmtpEmail.to = [{ email: this.to, name: this.firstName }];

      // Send the email
      const response = await Brevo.sendTransacEmail(sendSmtpEmail);
      // console.log('Email sent successfully:', response);
    } catch (error) {
      console.error('Error sending email:');
      console.error(error.message || error);

      if (error.response) {
        console.error('Response body:', error.response.body);
      }
    }
  }

  async renderPugTemplate(template) {
    const templatePath = `views/email/${template}.pug`;
    const compiledFunction = pug.compileFile(templatePath);
    return compiledFunction({ firstName: this.firstName, url: this.url });
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
}

// (async () => {
//   const email = new Email(
//     { email: 'boan.s.or.e@gmail.com', name: 'Jane Doe' },
//     'http://example.com',
//   );
//   console.log('Sending welcome email');
//   await email.sendWelcome();
// })();
