import type { ProfileDetails, ReferralOverview, User } from "@/app/page";
import { CurrencyGlyph } from "./Brand";

type Props = {
  user: User;
  profile: ProfileDetails;
  referral: ReferralOverview;
  onCopyReferral: () => void;
};

export function ProfilePanel({ user, profile, referral, onCopyReferral }: Props) {
  const displayName = user.nickname ?? user.firstName ?? user.username ?? "Игрок";

  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>Профиль</h2>
        <span className="subtle">Уровень {profile.level}</span>
      </div>

      <article className="profile-panel upliks-card">
        <div className="profile-headline">
          <div className="profile-avatar-wrap">
            {user.photoUrl ? <img src={user.photoUrl} alt="" className="hero-avatar" /> : <div className="hero-avatar fallback" />}
          </div>
          <div className="profile-title-copy">
            <strong>{displayName}</strong>
            <span>
              Раундов {profile.totalRounds} • Winrate {profile.winRate}%
            </span>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div>
            <span>Баланс</span>
            <strong className="value-inline">
              {user.balance}
              <CurrencyGlyph size="sm" />
            </strong>
          </div>
          <div>
            <span>Текущая серия</span>
            <strong>{profile.currentStreak}</strong>
          </div>
          <div>
            <span>Лучшая серия</span>
            <strong>{profile.bestStreak}</strong>
          </div>
          <div>
            <span>Приглашено</span>
            <strong>{referral.invitedCount}</strong>
          </div>
        </div>

        <div className="referral-card">
          <div className="referral-copy">
            <strong>Пригласи друзей</strong>
            <span>{referral.link}</span>
          </div>
          <button type="button" className="ghost-button small" onClick={onCopyReferral}>
            Скопировать
          </button>
        </div>

        <div className="referral-reward-row">
          <span>Наград получено</span>
          <strong className="value-inline">
            {referral.rewardsEarned}
            <CurrencyGlyph size="sm" />
          </strong>
        </div>
      </article>
    </section>
  );
}
