
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Dumbbell, CalendarDays, Apple, Ruler, CheckCircle2, ExternalLink, Home, Flame, HeartPulse } from "lucide-react";
import "./styles.css";

const profile = {
  name: "Анжелика",
  age: 30,
  height: "165 см",
  weight: "58.9 кг",
  waist: "69 см",
  hips: "97 см",
  goal: "убрать жир с живота, ног и бёдер; подкачать ягодицы; выглядеть спортивно, стройно и подтянуто",
  schedule: "4 тренировки в неделю, дома, без прыжков",
};

const techniqueLinks = {
  "Тяга штанги в наклоне": "https://fitnessprogramer.com/exercise/barbell-bent-over-row/",
  "Жим резинки вверх": "https://fitnessprogramer.com/exercise/resistance-band-shoulder-press/",
  "Face Pull резинкой": "https://fitnessprogramer.com/exercise/band-face-pull/",
  "Разведения рук в стороны": "https://fitnessprogramer.com/exercise/dumbbell-lateral-raise/",
  "Сгибание рук на бицепс": "https://fitnessprogramer.com/exercise/resistance-band-biceps-curl/",
  "Разгибание рук на трицепс": "https://fitnessprogramer.com/exercise/band-triceps-pushdown/",
  "Планка": "https://fitnessprogramer.com/exercise/plank/",
  "Dead Bug": "https://fitnessprogramer.com/exercise/dead-bug/",
  "Ягодичный мост со штангой": "https://fitnessprogramer.com/exercise/barbell-hip-thrust/",
  "Румынская тяга": "https://fitnessprogramer.com/exercise/barbell-romanian-deadlift/",
  "Болгарские выпады": "https://fitnessprogramer.com/exercise/bulgarian-split-squat/",
  "Monster Walk": "https://fitnessprogramer.com/exercise/monster-walk/",
  "Отведение ноги назад с резинкой": "https://fitnessprogramer.com/exercise/cable-glute-kickback/",
  "Тяга резинки сверху": "https://fitnessprogramer.com/exercise/resistance-band-lat-pulldown/",
  "Отжимания от опоры": "https://fitnessprogramer.com/exercise/incline-push-up/",
  "Step Jack без прыжка": "https://fitnessprogramer.com/exercise/jumping-jack/",
  "Медленный альпинист": "https://fitnessprogramer.com/exercise/mountain-climber/",
  "Plank Walkout": "https://fitnessprogramer.com/exercise/inchworm/",
  "Shadow Boxing": "https://www.youtube.com/results?search_query=shadow+boxing+workout+no+jumping",
  "Растяжка ягодиц": "https://www.youtube.com/results?search_query=glute+stretch+routine",
};

const workouts = [
  {
    day: "Понедельник",
    title: "Верх тела №1: спина, плечи, руки",
    focus: "визуально сузить талию за счёт осанки, подтянуть руки и плечевой пояс",
    duration: "60 минут",
    exercises: [
      ["Тяга штанги в наклоне", "4×10–12", "10–18 кг", "Лопатки назад и вниз, корпус стабилен."],
      ["Жим резинки вверх", "4×10–12", "средняя/плотная резинка", "Не прогибай поясницу."],
      ["Face Pull резинкой", "4×15", "резинка к двери", "Тяни к лицу, локти в стороны."],
      ["Разведения рук в стороны", "4×15", "утяжелители 1 кг / резинка", "Медленно, без рывков."],
      ["Сгибание рук на бицепс", "3×15", "резинка/штанга", "Локти прижаты."],
      ["Разгибание рук на трицепс", "3×15", "резинка к двери", "Движется только предплечье."],
      ["Планка", "3×45–60 сек", "свой вес", "Таз не проваливается."],
      ["Dead Bug", "3×12–15", "свой вес", "Поясница прижата к коврику."],
    ],
  },
  {
    day: "Среда",
    title: "Ягодицы + задняя поверхность бедра",
    focus: "подкачать ягодицы без лишнего акцента на квадрицепс",
    duration: "60 минут",
    exercises: [
      ["Ягодичный мост со штангой", "5×10–12", "12–20 кг + тканевая резинка", "Пауза 1 сек вверху."],
      ["Румынская тяга", "4×10–12", "12–20 кг", "Движение тазом назад, спина ровная."],
      ["Болгарские выпады", "3×10–12/нога", "свой вес/штанга", "Наклон корпуса чуть вперёд для ягодиц."],
      ["Отведение ноги назад с резинкой", "3×18–20/нога", "резинка к двери", "Не разворачивай таз."],
      ["Monster Walk", "3×20 шагов", "тканевая резинка", "Колени наружу, корпус собран."],
      ["Планка", "3×45 сек", "свой вес", "Кор напряжён."],
    ],
  },
  {
    day: "Пятница",
    title: "Верх тела №2 + кор",
    focus: "осанка, плечи, руки, живот",
    duration: "60 минут",
    exercises: [
      ["Тяга резинки сверху", "4×12–15", "резинка к двери", "Локти идут вниз к корпусу."],
      ["Face Pull резинкой", "4×15", "средняя резинка", "Не задирай плечи."],
      ["Отжимания от опоры", "4 подхода", "стул/диван", "Остановись за 1–2 повтора до отказа."],
      ["Разведения рук в стороны", "4×15", "1 кг/резинка", "Контроль в негативной фазе."],
      ["Сгибание рук на бицепс", "3×15", "резинка", "Темп 2 сек вверх, 2 сек вниз."],
      ["Разгибание рук на трицепс", "3×15", "резинка", "Полностью выпрямляй руку."],
      ["Dead Bug", "3×15", "свой вес", "Без отрыва поясницы."],
      ["Планка", "3×60 сек", "свой вес", "Дыхание ровное."],
    ],
  },
  {
    day: "Суббота",
    title: "Тихий Full Body: жиросжигание без прыжков",
    focus: "расход калорий, тонус всего тела, без шума для соседей",
    duration: "45–60 минут",
    exercises: [
      ["Step Jack без прыжка", "45 сек", "свой вес", "Активно работай руками."],
      ["Тяга штанги в наклоне", "12–15", "10–16 кг", "Без рывков."],
      ["Румынская тяга", "12–15", "10–18 кг", "Почувствуй заднюю поверхность бедра."],
      ["Жим резинки вверх", "12–15", "резинка", "Кор напряжён."],
      ["Медленный альпинист", "40 сек", "свой вес", "Шагами, без прыжка."],
      ["Plank Walkout", "8–10", "свой вес", "Медленно, контролируемо."],
      ["Shadow Boxing", "60 сек", "утяжелители 1 кг", "Лёгкие быстрые удары, без зажимов в шее."],
    ],
    note: "Сделай 4 круга. Отдых между упражнениями 20–30 сек, между кругами 90 сек.",
  },
];

const progression = [
  ["1–2", "Техника и адаптация", "10–12 кг", "2–3 повтора в запасе", "Без гонки за весом."],
  ["3–4", "Увеличение нагрузки", "12–15 кг", "1–2 повтора в запасе", "Добавь более плотные резинки."],
  ["5–6", "Суперсеты и плотность", "15–18 кг", "последний подход почти до отказа", "Меньше отдыха, больше контроля."],
  ["7–8", "Финальный блок", "18–20 кг", "почти до отказа в ключевых упражнениях", "Не жертвуй техникой."],
];

const mealPlan = [
  {
    meal: "Завтрак",
    options: [
      "Омлет из 2 яиц + 150 г творога/йогурта + овощи + хлебец/тост",
      "Овсянка 60 г + протеин/творог + ягоды + 10 г орехов",
      "Творог 250 г + ягоды + мёд 10 г + цельнозерновой тост",
    ],
  },
  {
    meal: "Обед",
    options: [
      "Курица/индейка 150–180 г + рис/гречка 60–80 г в сухом виде + овощи",
      "Говядина нежирная 130–160 г + картофель 250 г + салат",
      "Паста из твёрдых сортов 70 г + курица 150 г + овощи",
    ],
  },
  {
    meal: "Ужин",
    options: [
      "Индейка/курица 150–180 г + овощи + авокадо/оливковое масло",
      "Омлет 2 яйца + белки/творог + салат",
      "Творог 250 г + ягоды, если хочется лёгкий ужин",
    ],
  },
];

const shopping = [
  "яйца — 20 шт.",
  "творог/греческий йогурт — 1.5–2 кг",
  "курица/индейка — 1.5–2 кг",
  "нежирная говядина — 500–700 г",
  "рис/гречка/овсянка/паста — по выбору",
  "овощи — 3–5 кг",
  "ягоды/фрукты — 1.5–2 кг",
  "орехи — 150–200 г",
  "оливковое масло/авокадо",
];

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="section">
      <h2>{Icon && <Icon size={24} />} {title}</h2>
      {children}
    </section>
  );
}

function LinkButton({ name }) {
  const url = techniqueLinks[name];
  if (!url) return null;
  return <a className="techLink" href={url} target="_blank" rel="noreferrer">GIF/видео <ExternalLink size={14}/></a>;
}

function App() {
  const [checked, setChecked] = useState(() => JSON.parse(localStorage.getItem("fitnessChecked") || "{}"));

  function toggle(key) {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    localStorage.setItem("fitnessChecked", JSON.stringify(next));
  }

  const weeks = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const trainingDays = ["Пн: Верх 1", "Ср: Ягодицы", "Пт: Верх 2", "Сб: Full Body"];

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">8-недельный домашний планер</p>
          <h1>Фитнес-планер для {profile.name}</h1>
          <p className="subtitle">{profile.goal}</p>
          <div className="heroTags">
            <span>{profile.height}</span><span>{profile.weight}</span><span>{profile.age} лет</span><span>талия {profile.waist}</span><span>бёдра {profile.hips}</span>
          </div>
        </div>
      </header>

      <nav className="nav">
        <a href="#calendar">Календарь</a>
        <a href="#workouts">Тренировки</a>
        <a href="#progression">Прогрессия</a>
        <a href="#nutrition">Питание</a>
        <a href="#measurements">Замеры</a>
      </nav>

      <Section id="strategy" icon={HeartPulse} title="Стратегия">
        <div className="cardGrid">
          <div className="card"><b>Главная цель</b><p>Рекомпозиция: жир ↓, мышечный тонус ↑, без сильного похудения.</p></div>
          <div className="card"><b>Акцент</b><p>Плечи, спина, руки, ягодицы. Ноги не перегружаем квадрицепсами.</p></div>
          <div className="card"><b>Домашний формат</b><p>Без прыжков и шума: все кардио-упражнения заменены на тихие аналоги.</p></div>
        </div>
      </Section>

      <Section id="calendar" icon={CalendarDays} title="Календарь на 8 недель">
        <p className="hint">Отметки сохраняются в браузере через localStorage.</p>
        <div className="calendar">
          {weeks.map((week) => (
            <div className="week" key={week}>
              <h3>Неделя {week}</h3>
              {trainingDays.map((day) => {
                const key = `${week}-${day}`;
                return (
                  <label className="checkRow" key={key}>
                    <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} />
                    <span>{day}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </Section>

      <Section id="workouts" icon={Dumbbell} title="Тренировки">
        <div className="workoutList">
          {workouts.map((w) => (
            <article className="workout" key={w.title}>
              <div className="workoutHead">
                <span>{w.day}</span>
                <h3>{w.title}</h3>
                <p>{w.focus}</p>
                <small>{w.duration}</small>
              </div>
              {w.note && <p className="note">{w.note}</p>}
              <div className="exerciseTable">
                <div className="row header"><span>Упражнение</span><span>Объём</span><span>Нагрузка</span><span>Техника</span></div>
                {w.exercises.map(([name, reps, load, cue]) => (
                  <div className="row" key={name + reps}>
                    <span><b>{name}</b><LinkButton name={name}/></span>
                    <span>{reps}</span>
                    <span>{load}</span>
                    <span>{cue}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="progression" icon={Flame} title="Прогрессия нагрузки">
        <div className="table">
          <div className="row header"><span>Недели</span><span>Фокус</span><span>Штанга</span><span>Интенсивность</span><span>Комментарий</span></div>
          {progression.map((r) => <div className="row" key={r[0]}>{r.map((c) => <span key={c}>{c}</span>)}</div>)}
        </div>
      </Section>

      <Section id="nutrition" icon={Apple} title="Питание 1700–1850 ккал, 3 приёма пищи, без рыбы">
        <div className="macroBox">
          <b>Ориентиры:</b> белок 105–120 г, жиры 50–60 г, углеводы 160–190 г. Не опускайся ниже 1700 ккал без необходимости.
        </div>
        <div className="mealGrid">
          {mealPlan.map((m) => (
            <div className="meal" key={m.meal}>
              <h3>{m.meal}</h3>
              <ul>{m.options.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
          ))}
        </div>
        <h3>Список покупок на неделю</h3>
        <ul className="shopping">{shopping.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>

      <Section id="measurements" icon={Ruler} title="Трекер замеров">
        <div className="table measurements">
          <div className="row header"><span>Неделя</span><span>Вес</span><span>Талия</span><span>Живот</span><span>Бёдра</span><span>Комментарий</span></div>
          {weeks.map((w) => <div className="row" key={w}><span>{w}</span><span></span><span></span><span></span><span></span><span></span></div>)}
        </div>
      </Section>

      <Section id="rules" icon={CheckCircle2} title="Правила выполнения">
        <ol className="rules">
          <li>Техника важнее скорости и веса.</li>
          <li>Отдых между силовыми подходами: 60–90 сек.</li>
          <li>В круговой тренировке отдых между упражнениями: 20–30 сек.</li>
          <li>Шаги: цель 8–12 тысяч в день.</li>
          <li>Фото-контроль: 1 раз в неделю, одинаковый свет и ракурс.</li>
          <li>Если пропустила тренировку — просто продолжай со следующей, не делай две тяжёлые подряд.</li>
        </ol>
      </Section>

      <footer>
        <Home size={18}/> Сделано как персональный домашний планер. Ссылки ведут на страницы с техникой/GIF или поиск видео.
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
