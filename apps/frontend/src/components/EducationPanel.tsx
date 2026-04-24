import type { EducationLessonFull, EducationLessonPreview } from "@/app/page";
import { AppIcon } from "./Icon";

type Props = {
  lessons: EducationLessonPreview[];
  activeLesson: EducationLessonFull | null;
  onSelectLesson: (lessonId: string) => void;
  onBack?: () => void;
};

export function EducationPanel({ lessons, activeLesson, onSelectLesson, onBack }: Props) {
  if (activeLesson) {
    return (
      <section className="upliks-section">
        <div className="section-title-row">
          <h2>{activeLesson.title}</h2>
          {onBack ? (
            <button type="button" className="ghost-button small" onClick={onBack}>
              Назад
            </button>
          ) : null}
        </div>

        <article className="lesson-full upliks-card">
          <p className="lesson-summary">{activeLesson.summary}</p>
          {activeLesson.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {activeLesson.quiz ? (
            <div className="lesson-quiz">
              <strong>{activeLesson.quiz.question}</strong>
              <p>{activeLesson.quiz.answer}</p>
            </div>
          ) : null}
          {onBack ? (
            <button type="button" className="primary-cta compact-cta" onClick={onBack}>
              Понятно
            </button>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>Научись трейдингу</h2>
        <span className="subtle">Короткие уроки о рынке, волатильности и риске</span>
      </div>
      <div className="stack-list">
        {lessons.map((lesson) => (
          <button key={lesson.id} type="button" className="lesson-card upliks-card" onClick={() => onSelectLesson(lesson.id)}>
            <div>
              <strong>{lesson.title}</strong>
              <p>{lesson.summary}</p>
            </div>
            <span className="lesson-arrow">
              <AppIcon name="arrow-right" size={22} tone="lime" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
