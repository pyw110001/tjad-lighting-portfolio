import { useState } from 'react';
import { team } from '../content';
import { Arrow } from '../components/ui';
import { useLanguage } from '../language';

export default function Contact() {
  const [message, setMessage] = useState('');
  const { pick } = useLanguage();
  async function copy() {
    try {
      await navigator.clipboard.writeText(team.email);
      setMessage(pick('邮箱已复制', 'Email copied'));
    } catch {
      setMessage(pick('请选中上方邮箱并复制', 'Select and copy the email above'));
    }
  }
  return <section className="section page contact-page"><div className="contact-heading"><h1>LET’S<br />SHAPE<br />THE NIGHT.</h1><p>{pick('通过光，创造下一个空间故事。', 'Let light shape the next spatial story.')}</p></div><div className="contact-details"><h2>{pick('项目咨询', 'Project enquiries')}</h2><div className="email-row"><a href={`mailto:${team.email}`} className="email">{team.email}</a><button className="outline-button" onClick={copy}>{pick('复制邮箱', 'Copy email')}</button></div><a className="text-link" href={`mailto:${team.email}?subject=${encodeURIComponent(pick('建筑照明项目咨询', 'Architectural lighting project enquiry'))}`}>{pick('撰写邮件', 'Write an email')}<Arrow /></a><p className="contact-phone">{pick('办公电话', 'Office phone')} <a href={`tel:${team.phone.replaceAll(' ', '')}`}>{team.phone}</a></p><small>{pick('联系方式源自 2023 年团队画册', 'Contact details from the 2023 studio portfolio')}</small><span className="copy-status" role="status">{message}</span></div></section>;
}
