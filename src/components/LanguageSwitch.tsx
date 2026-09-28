import { useLanguage } from '../language';
import './language-switch.css';

export default function LanguageSwitch({ className = '' }: { className?: string }) {
  const { language, setLanguage, pick } = useLanguage();

  return (
    <div className={`language-switch ${className}`} role="group" aria-label={pick('语言切换', 'Language selection')}>
      <button
        type="button"
        lang="zh-CN"
        aria-label={pick('切换为中文', 'Switch to Chinese')}
        aria-pressed={language === 'zh'}
        onClick={() => setLanguage('zh')}
      >
        中
      </button>
      <span className="language-switch-divider" aria-hidden="true" />
      <button
        type="button"
        lang="en"
        aria-label={pick('切换为英文', 'Switch to English')}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}
