type Props = {
  title: string;
  subtitle: string;
  onClose: () => void;
  onMore: () => void;
};

export function TelegramHeader({ title, subtitle, onClose, onMore }: Props) {
  return (
    <header className="telegram-mini-header">
      <button type="button" className="telegram-mini-header__link" onClick={onClose}>
        Закрыть
      </button>

      <div className="telegram-mini-header__center">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <button type="button" className="telegram-mini-header__more" aria-label="Меню" onClick={onMore}>
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
