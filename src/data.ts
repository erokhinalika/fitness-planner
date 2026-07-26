import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  AudioLines,
  BicepsFlexed,
  Dumbbell,
  Flame,
  HeartPulse,
  Salad,
  Sparkles,
  Target,
} from "lucide-react";

export type WorkoutId = "upper-a" | "glutes" | "upper-b" | "full-body";
export type ExerciseCategory = "Верх" | "Ягодицы" | "Кор" | "Кардио";
export type Equipment =
  | "штанга"
  | "гантели"
  | "резинки"
  | "тканевая резинка"
  | "коврик"
  | "стул/диван"
  | "свой вес"
  | "утяжелители";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment[];
  muscles: string;
  mediaUrl?: string;
  sourceUrl: string;
  setup: string;
  technique: string[];
  quietCue: string;
  Icon: LucideIcon;
  alternatives?: string[];
};

export type WorkoutExercise = {
  exerciseId: string;
  volume: string;
  load: string;
  cue: string;
};

export type CircuitConfig = {
  rounds: number;
  exerciseRestSec: number;
  roundRestSec: number;
};

export type WorkoutCompletionEffect = {
  title: string;
  summary: string;
  bullets: string[];
  recovery: string;
};

export type Workout = {
  id: WorkoutId;
  day: string;
  shortDay: string;
  title: string;
  focus: string;
  duration: string;
  accent: string;
  exercises: WorkoutExercise[];
  completionEffect: WorkoutCompletionEffect;
  note?: string;
  circuit?: CircuitConfig;
};

export type ProgressionBlock = {
  weeks: string;
  focus: string;
  barbell: string;
  intensity: string;
  cue: string;
};

export type MealBlock = {
  id: string;
  title: string;
  target: string;
  options: MealOption[];
};

export type MealOption = {
  id: string;
  title: string;
  description: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  tags: string[];
};

export type WarmupStep = {
  id: string;
  title: string;
  duration: string;
  details: string;
};

export type Playlist = {
  id: string;
  title: string;
  mood: string;
  url: string;
  bpm: string;
};

export const profile = {
  name: "Анжелика",
  age: 30,
  height: 165,
  weight: 58.9,
  waist: 69,
  hips: 97,
  goal: "спортивное, стройное тело без сильного снижения веса",
  calories: "1700-1850 ккал",
  macros: "Б 105-120 г | Ж 50-60 г | У 160-190 г",
};

export const exercises: Exercise[] = [
  {
    id: "barbell-row",
    name: "Тяга штанги в наклоне",
    category: "Верх",
    equipment: ["штанга"],
    muscles: "широчайшие, ромбовидные, задняя дельта, кор",
    mediaUrl: "/exercises/barbell-row.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/barbell-bent-over-row/",
    setup: "Стопы на ширине таза, корпус в наклоне, штанга под плечами.",
    technique: [
      "Подай таз назад и держи нейтральную спину.",
      "Тяни штангу к нижним рёбрам, не задирая плечи.",
      "Внизу полностью контролируй вес, без рывка корпусом.",
    ],
    quietCue: "Опускай штангу плавно.",
    Icon: Dumbbell,
    alternatives: ["db-row"],
  },
  {
    id: "band-press",
    name: "Жим резинки вверх",
    category: "Верх",
    equipment: ["резинки"],
    muscles: "плечи, трицепс, верх груди",
    mediaUrl: "/exercises/band-press.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/resistance-band-shoulder-press/",
    setup: "Встань на резинку, ручки у плеч, рёбра опущены.",
    technique: [
      "Выжимай ручки вертикально, не прогибая поясницу.",
      "Локти движутся чуть впереди корпуса.",
      "Опускай медленно до уровня плеч.",
    ],
    quietCue: "Движение плавное.",
    Icon: BicepsFlexed,
    alternatives: ["db-shoulder-press"],
  },
  {
    id: "face-pull",
    name: "Тяга к лицу",
    category: "Верх",
    equipment: ["резинки"],
    muscles: "задняя дельта, трапеция, ротаторы плеча",
    mediaUrl: "/exercises/face-pull.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/band-face-pull/",
    setup: "Закрепи резинку на двери на уровне лица.",
    technique: [
      "Тяни к лицу, локти раскрываются в стороны.",
      "В конце движения сведи лопатки и задержись на секунду.",
      "Шея длинная, плечи не поднимаются к ушам.",
    ],
    quietCue: "Проверь крепление резинки до подхода.",
    Icon: Target,
    alternatives: ["band-pulldown", "db-row"],
  },
  {
    id: "lateral-raise",
    name: "Разведения рук в стороны",
    category: "Верх",
    equipment: ["гантели", "утяжелители", "резинки"],
    muscles: "средняя дельта",
    mediaUrl: "/exercises/lateral-raise.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-lateral-raise/",
    setup: "Лёгкий наклон корпуса, руки чуть согнуты.",
    technique: [
      "Поднимай руки до линии плеч, не выше.",
      "Веди локтем, а не кистью.",
      "Опускай медленно, сохраняя напряжение.",
    ],
    quietCue: "Лучше медленнее и легче, чем слишком тяжело.",
    Icon: Sparkles,
  },
  {
    id: "biceps",
    name: "Сгибание рук на бицепс",
    category: "Верх",
    equipment: ["резинки", "штанга"],
    muscles: "бицепс, предплечья",
    mediaUrl: "/exercises/biceps.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/resistance-band-biceps-curl/",
    setup: "Локти прижаты к корпусу, кисти нейтральны.",
    technique: [
      "Сгибай без раскачки корпусом.",
      "Вверху не выводи локти вперёд.",
      "Опускай на 2 секунды.",
    ],
    quietCue: "Контроль амплитуды важнее натяжения.",
    Icon: BicepsFlexed,
    alternatives: ["db-curl"],
  },
  {
    id: "triceps",
    name: "Разгибание рук на трицепс",
    category: "Верх",
    equipment: ["резинки"],
    muscles: "трицепс",
    mediaUrl: "/exercises/triceps.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/band-triceps-pushdown/",
    setup: "Резинка закреплена сверху, локти рядом с корпусом.",
    technique: [
      "Разгибай руки вниз до полного выпрямления.",
      "Плечо остаётся неподвижным.",
      "Возвращайся медленно, не теряя натяжение.",
    ],
    quietCue: "Сделай шаг назад, если резинка натянута слишком сильно.",
    Icon: BicepsFlexed,
    alternatives: ["db-triceps"],
  },
  {
    id: "plank",
    name: "Планка",
    category: "Кор",
    equipment: ["коврик", "свой вес"],
    muscles: "поперечная мышца живота, плечи, ягодицы",
    mediaUrl: "/exercises/plank.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/plank/",
    setup: "Локти под плечами, стопы на ширине таза.",
    technique: [
      "Подкрути таз и слегка напряги ягодицы.",
      "Дыши ровно, не проваливайся в пояснице.",
      "Заканчивай подход до потери формы.",
    ],
    quietCue: "Заканчивай подход, пока держишь форму.",
    Icon: HeartPulse,
    alternatives: ["dead-bug", "walkout"],
  },
  {
    id: "dead-bug",
    name: "Мёртвый жук",
    category: "Кор",
    equipment: ["коврик", "свой вес"],
    muscles: "глубокий кор, стабилизация таза",
    mediaUrl: "/exercises/dead-bug.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dead-bug/",
    setup: "Лёжа на спине, руки вверх, колени под 90 градусов.",
    technique: [
      "Прижми поясницу к коврику.",
      "Опускай противоположные руку и ногу медленно.",
      "Возвращайся без раскачки таза.",
    ],
    quietCue: "Поясница остаётся прижатой к полу.",
    Icon: HeartPulse,
    alternatives: ["plank"],
  },
  {
    id: "hip-thrust",
    name: "Ягодичный мост со штангой",
    category: "Ягодицы",
    equipment: ["штанга", "тканевая резинка", "стул/диван"],
    muscles: "ягодицы, задняя поверхность бедра",
    mediaUrl: "/exercises/hip-thrust.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/barbell-hip-thrust/",
    setup: "Лопатки на диване, штанга на тазу через полотенце.",
    technique: [
      "Поднимай таз до прямой линии плечи-таз-колени.",
      "Пауза 1 секунду вверху.",
      "Не переразгибай поясницу.",
    ],
    quietCue: "Положи полотенце под штангу.",
    Icon: Flame,
    alternatives: ["db-hip-thrust"],
  },
  {
    id: "rdl",
    name: "Румынская тяга",
    category: "Ягодицы",
    equipment: ["штанга"],
    muscles: "задняя поверхность бедра, ягодицы, разгибатели спины",
    mediaUrl: "/exercises/rdl.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/barbell-romanian-deadlift/",
    setup: "Штанга у бёдер, колени мягкие, лопатки собраны.",
    technique: [
      "Отводи таз назад, штанга скользит вдоль ног.",
      "Остановись, когда чувствуешь растяжение задней поверхности бедра.",
      "Поднимайся за счёт ягодиц, не поясницы.",
    ],
    quietCue: "Штанга скользит вдоль ног.",
    Icon: Dumbbell,
    alternatives: ["db-rdl"],
  },
  {
    id: "bulgarian",
    name: "Болгарские выпады",
    category: "Ягодицы",
    equipment: ["стул/диван", "штанга", "гантели", "свой вес"],
    muscles: "ягодицы, задняя поверхность бедра, стабилизаторы",
    mediaUrl: "/exercises/bulgarian.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/bulgarian-split-squat/",
    setup: "Задняя стопа на диване, передняя нога достаточно далеко.",
    technique: [
      "Корпус слегка наклонён вперёд.",
      "Дави пяткой передней ноги в пол.",
      "Не проваливай колено внутрь.",
    ],
    quietCue: "Передняя нога достаточно далеко от опоры.",
    Icon: Armchair,
  },
  {
    id: "kickback",
    name: "Отведение ноги назад с резинкой",
    category: "Ягодицы",
    equipment: ["резинки"],
    muscles: "большая ягодичная",
    mediaUrl: "/exercises/kickback.webp",
    sourceUrl: "https://loadmuscle.com/exercises/band-standing-hip-extension/",
    setup: "Резинка закреплена низко, корпус слегка в наклоне.",
    technique: [
      "Отводи ногу назад без разворота таза.",
      "Вверху сожми ягодицу.",
      "Возвращайся медленно.",
    ],
    quietCue: "Таз не разворачивается в сторону.",
    Icon: Flame,
    alternatives: ["monster-walk"],
  },
  {
    id: "monster-walk",
    name: "Ходьба с резинкой",
    category: "Ягодицы",
    equipment: ["тканевая резинка"],
    muscles: "средняя ягодичная, стабилизация таза",
    mediaUrl: "/exercises/monster-walk.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/monster-walk/",
    setup: "Резинка над коленями или на голенях, полуприсед.",
    technique: [
      "Колени направлены наружу.",
      "Шаги короткие, таз стабилен.",
      "Не выпрямляйся между шагами.",
    ],
    quietCue: "Колени смотрят в сторону носков.",
    Icon: Flame,
    alternatives: ["kickback"],
  },
  {
    id: "band-pulldown",
    name: "Тяга резинки сверху",
    category: "Верх",
    equipment: ["резинки"],
    muscles: "широчайшие, нижняя трапеция, бицепс",
    mediaUrl: "/exercises/band-pulldown.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/resistance-band-lat-pulldown/",
    setup: "Резинка закреплена сверху, сядь или встань устойчиво.",
    technique: [
      "Тяни локти вниз к корпусу.",
      "Внизу опусти лопатки.",
      "Не заваливайся назад ради амплитуды.",
    ],
    quietCue: "Проверь крепление резинки до подхода.",
    Icon: Target,
    alternatives: ["face-pull", "db-row"],
  },
  {
    id: "incline-pushup",
    name: "Отжимания от опоры",
    category: "Верх",
    equipment: ["стул/диван", "свой вес"],
    muscles: "грудь, трицепс, плечи, кор",
    mediaUrl: "/exercises/incline-pushup.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/incline-push-up/",
    setup: "Ладони на опоре, тело в прямой линии.",
    technique: [
      "Опускайся грудью к опоре.",
      "Локти идут под углом 30-45 градусов.",
      "Остановись за 1-2 повтора до отказа.",
    ],
    quietCue: "Опора должна быть устойчивой.",
    Icon: BicepsFlexed,
  },
  {
    id: "step-jack",
    name: "Шаги в сторону",
    category: "Кардио",
    equipment: ["свой вес"],
    muscles: "сердечно-сосудистая нагрузка, плечи, ноги",
    mediaUrl: "/exercises/step-jack.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/jumping-jack/",
    setup: "Шаг в сторону и возвращение в исходное положение.",
    technique: [
      "Работай руками в том же ритме, что и ноги.",
      "Стопа ставится полностью.",
      "Держи темп разговорно тяжёлым.",
    ],
    quietCue: "Шаг мягкий, без отрыва двух ног сразу.",
    Icon: AudioLines,
  },
  {
    id: "slow-mountain",
    name: "Медленный альпинист",
    category: "Кардио",
    equipment: ["коврик", "свой вес"],
    muscles: "кор, плечи, сгибатели бедра",
    mediaUrl: "/exercises/slow-mountain.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/mountain-climber/",
    setup: "Планка на ладонях, плечи над кистями.",
    technique: [
      "Подводи колено к груди шагом.",
      "Таз остаётся низко и стабильно.",
      "Чередуй ноги в ровном темпе.",
    ],
    quietCue: "Темп ровный, без рывков.",
    Icon: HeartPulse,
  },
  {
    id: "walkout",
    name: "Выход в планку",
    category: "Кор",
    equipment: ["коврик", "свой вес"],
    muscles: "кор, плечи, задняя поверхность бедра",
    mediaUrl: "/exercises/walkout.webp",
    sourceUrl: "https://fitnessprogramer.com/exercise/inchworm/",
    setup: "Из наклона шагай руками вперёд до планки.",
    technique: [
      "Двигайся медленно и контролируемо.",
      "В планке задержись на один вдох.",
      "Возвращайся руками назад.",
    ],
    quietCue: "Руки ставь под плечами.",
    Icon: HeartPulse,
    alternatives: ["plank"],
  },
  {
    id: "shadow-boxing",
    name: "Удары в воздухе",
    category: "Кардио",
    equipment: ["утяжелители", "свой вес"],
    muscles: "плечи, руки, кор, кардио",
    mediaUrl: "/exercises/shadow-boxing.webp",
    sourceUrl: "https://loadmuscle.com/exercises/alternate-punching/",
    setup: "Стойка мягкая, локти не блокируются.",
    technique: [
      "Бей легко и быстро, без резкого разгибания локтя.",
      "Корпус вращается вместе с ударом.",
      "Плечи расслаблены, шея длинная.",
    ],
    quietCue: "Плечи расслаблены, корпус стабилен.",
    Icon: AudioLines,
  },
  {
    id: "db-row",
    name: "Тяга гантели в наклоне",
    category: "Верх",
    equipment: ["гантели"],
    muscles: "широчайшие, ромбовидные, задняя дельта, бицепс",
    mediaUrl: "/exercises/db-row.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-row/",
    setup: "Колено и рука одноимённой стороны на скамье или стуле, спина ровная, корпус параллельно полу.",
    technique: [
      "Тяни гантель вверх, локоть идёт вдоль корпуса к тазу.",
      "Вверху на секунду сведи лопатку к позвоночнику.",
      "Опускай гантель медленно, не теряя контроль.",
    ],
    quietCue: "Спина остаётся ровной, без скручивания.",
    Icon: Dumbbell,
    alternatives: ["barbell-row"],
  },
  {
    id: "db-rdl",
    name: "Румынская тяга с гантелями",
    category: "Ягодицы",
    equipment: ["гантели"],
    muscles: "задняя поверхность бедра, ягодицы, разгибатели спины",
    mediaUrl: "/exercises/db-rdl.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-romanian-deadlift/",
    setup: "Стопы на ширине таза, гантели перед бёдрами, колени мягкие.",
    technique: [
      "Отводи таз назад, гантели скользят вдоль ног.",
      "Останавливайся, когда чувствуешь растяжение задней поверхности бедра.",
      "Поднимайся за счёт ягодиц, толкая таз вперёд.",
    ],
    quietCue: "Гантели держи ближе к ногам.",
    Icon: Dumbbell,
    alternatives: ["rdl"],
  },
  {
    id: "db-hip-thrust",
    name: "Ягодичный мост с гантелью",
    category: "Ягодицы",
    equipment: ["гантели"],
    muscles: "ягодицы, задняя поверхность бедра",
    mediaUrl: "/exercises/db-hip-thrust.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-glute-bridge/",
    setup: "Лёжа на спине, колени согнуты, гантель на тазу придерживай руками.",
    technique: [
      "Подними таз вверх, толкая пятками в пол, до прямой линии плечи-таз-колени.",
      "Вверху на секунду сожми ягодицы.",
      "Опускай таз медленно, не роняя вес.",
    ],
    quietCue: "Придерживай гантель руками, чтобы не каталась.",
    Icon: Flame,
    alternatives: ["hip-thrust"],
  },
  {
    id: "db-shoulder-press",
    name: "Жим гантелей стоя",
    category: "Верх",
    equipment: ["гантели"],
    muscles: "плечи, трицепс, верх груди",
    mediaUrl: "/exercises/db-shoulder-press.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/standing-dumbbell-shoulder-press/",
    setup: "Стоя, стопы на ширине плеч, гантели у плеч ладонями вперёд.",
    technique: [
      "Выжимай гантели вверх, не прогибая поясницу.",
      "Кисти остаются над локтями на всём пути.",
      "Опускай гантели до уровня плеч под контролем.",
    ],
    quietCue: "Корпус стабилен, без раскачки.",
    Icon: BicepsFlexed,
    alternatives: ["band-press"],
  },
  {
    id: "db-curl",
    name: "Сгибание рук с гантелями",
    category: "Верх",
    equipment: ["гантели"],
    muscles: "бицепс, предплечья",
    mediaUrl: "/exercises/db-curl.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-curl/",
    setup: "Стоя, гантели у бёдер, ладони развёрнуты внутрь.",
    technique: [
      "Сгибай руки без раскачки корпусом, локти у корпуса.",
      "Вверху сожми бицепс на секунду.",
      "Опускай на 2 секунды, полностью выпрямляя руку.",
    ],
    quietCue: "Локти неподвижны на протяжении всего движения.",
    Icon: BicepsFlexed,
    alternatives: ["biceps"],
  },
  {
    id: "db-triceps",
    name: "Разгибание гантели из-за головы",
    category: "Верх",
    equipment: ["гантели"],
    muscles: "трицепс",
    mediaUrl: "/exercises/db-triceps.gif",
    sourceUrl: "https://fitnessprogramer.com/exercise/dumbbell-triceps-extension/",
    setup: "Стоя или сидя, гантель держи двумя руками за верхний блин, руки выпрямлены над головой.",
    technique: [
      "Сгибай локти, опуская гантель за голову, локти смотрят вперёд.",
      "Опускай до параллели предплечий с полом.",
      "Разгибай руки вверх, не разводя локти в стороны.",
    ],
    quietCue: "Локти держи близко к ушам.",
    Icon: BicepsFlexed,
    alternatives: ["triceps"],
  },
];

export const workouts: Workout[] = [
  {
    id: "upper-a",
    day: "Понедельник",
    shortDay: "Пн",
    title: "Верх тела A",
    focus: "спина, плечи, руки, осанка",
    duration: "55-60 мин",
    accent: "спина, плечи, руки",
    completionEffect: {
      title: "После тренировки",
      summary: "Должно ощущаться, что спина раскрылась, плечи стали стабильнее, а руки получили рабочую, но не болезненную нагрузку.",
      bullets: [
        "приятное тепло между лопатками и в широчайших",
        "плечи уставшие, но без зажима в шее",
        "бицепс и трицепс чувствуют работу, но локти не болят",
      ],
      recovery: "Если забилась шея или поясница, в следующий раз снизь резинку/вес и держи лопатки спокойнее.",
    },
    exercises: [
      { exerciseId: "barbell-row", volume: "4x10-12", load: "штанга 10-12 кг общим весом", cue: "лопатки назад и вниз" },
      { exerciseId: "band-press", volume: "4x10-12", load: "лёгкая/средняя резинка с ручками", cue: "рёбра вниз" },
      { exerciseId: "face-pull", volume: "4x15", load: "лёгкая резинка с ручками к двери", cue: "локти в стороны" },
      { exerciseId: "lateral-raise", volume: "4x15", load: "утяжелители 1 кг или лёгкая резинка", cue: "медленная негативная фаза" },
      { exerciseId: "biceps", volume: "3x12-15", load: "лёгкая резинка с ручками", cue: "локти прижаты" },
      { exerciseId: "triceps", volume: "3x12-15", load: "лёгкая/средняя резинка сверху", cue: "движется предплечье" },
      { exerciseId: "plank", volume: "3x45-60 сек", load: "свой вес", cue: "таз стабилен" },
      { exerciseId: "dead-bug", volume: "3x12-15", load: "свой вес", cue: "поясница прижата" },
    ],
  },
  {
    id: "glutes",
    day: "Среда",
    shortDay: "Ср",
    title: "Ягодицы + задняя цепь",
    focus: "ягодицы, задняя поверхность бедра, без лишнего добивания ног",
    duration: "55-60 мин",
    accent: "ягодицы и задняя поверхность бедра",
    completionEffect: {
      title: "После тренировки",
      summary: "Главное ощущение должно быть в ягодицах и задней поверхности бедра, без сильного забивания передней части ног.",
      bullets: [
        "ягодицы плотные и тёплые, особенно после моста",
        "задняя поверхность бедра чувствует растяжение и работу",
        "поясница не должна быть главным местом усталости",
      ],
      recovery: "Если сильнее всего устала поясница, уменьши вес в тяге и делай таз назад медленнее.",
    },
    exercises: [
      { exerciseId: "hip-thrust", volume: "5x10-12", load: "штанга 12-20 кг общим весом", cue: "пауза вверху" },
      { exerciseId: "rdl", volume: "4x10-12", load: "штанга 12-18 кг общим весом", cue: "таз назад" },
      { exerciseId: "bulgarian", volume: "3x10-12/нога", load: "свой вес, потом штанга до 10-12 кг общим весом", cue: "наклон к ягодице" },
      { exerciseId: "kickback", volume: "3x18-20/нога", load: "лёгкая/средняя резинка с ручкой низко", cue: "таз не раскрывать" },
      { exerciseId: "monster-walk", volume: "3x20 шагов", load: "средняя тканевая резинка над коленями", cue: "колени наружу" },
      { exerciseId: "plank", volume: "3x45 сек", load: "свой вес", cue: "кор напряжён" },
    ],
  },
  {
    id: "upper-b",
    day: "Пятница",
    shortDay: "Пт",
    title: "Верх тела B",
    focus: "широчайшие, руки, кор",
    duration: "55-60 мин",
    accent: "спина, плечи, кор",
    completionEffect: {
      title: "После тренировки",
      summary: "Должно быть ощущение подтянутой спины, включённых рук и устойчивого корпуса.",
      bullets: [
        "широчайшие и область под лопатками чувствуют работу",
        "руки устали равномерно, без боли в локтях и запястьях",
        "кор держал корпус, но поясница не перегружена",
      ],
      recovery: "Если плечи тянет к ушам, бери более лёгкую резинку и делай тяги медленнее.",
    },
    exercises: [
      { exerciseId: "band-pulldown", volume: "4x12-15", load: "средняя резинка с ручками сверху", cue: "локти вниз" },
      { exerciseId: "face-pull", volume: "4x15", load: "лёгкая/средняя резинка с ручками", cue: "плечи не задирать" },
      { exerciseId: "incline-pushup", volume: "4 подхода", load: "стул/диван", cue: "1-2 повтора в запасе" },
      { exerciseId: "lateral-raise", volume: "4x15", load: "утяжелители 1 кг или лёгкая резинка", cue: "без рывков" },
      { exerciseId: "biceps", volume: "3x12-15", load: "лёгкая/средняя резинка с ручками", cue: "темп 2-0-2" },
      { exerciseId: "triceps", volume: "3x12-15", load: "лёгкая/средняя резинка сверху", cue: "полное выпрямление" },
      { exerciseId: "dead-bug", volume: "3x15", load: "свой вес", cue: "таз стабилен" },
      { exerciseId: "plank", volume: "3x60 сек", load: "свой вес", cue: "дышать ровно" },
    ],
  },
  {
    id: "full-body",
    day: "Суббота",
    shortDay: "Сб",
    title: "Всё тело",
    focus: "круговая тренировка",
    duration: "45-60 мин",
    accent: "4 круга",
    note: "Отдых между упражнениями 20–30 сек, между кругами 90 сек.",
    completionEffect: {
      title: "После тренировки",
      summary: "Эффект должен быть общий: пульс выше, тело разогрето, мышцы поработали, но без ощущения полного разбора.",
      bullets: [
        "дыхание участилось, но восстановилось за несколько минут",
        "спина, ягодицы, плечи и кор включились без острой боли",
        "после тренировки остаётся тонус, а не сильная разбитость",
      ],
      recovery: "Если круговая выбивает слишком сильно, оставь 3 круга или увеличь отдых до 45 секунд.",
    },
    circuit: {
      rounds: 4,
      exerciseRestSec: 25,
      roundRestSec: 90,
    },
    exercises: [
      { exerciseId: "step-jack", volume: "45 сек", load: "свой вес", cue: "шаг в сторону" },
      { exerciseId: "barbell-row", volume: "12-15", load: "штанга 10-12 кг общим весом", cue: "без рывков" },
      { exerciseId: "rdl", volume: "12-15", load: "штанга 10-14 кг общим весом", cue: "задняя поверхность бедра" },
      { exerciseId: "band-press", volume: "12-15", load: "лёгкая резинка с ручками", cue: "кор напряжён" },
      { exerciseId: "slow-mountain", volume: "40 сек", load: "свой вес", cue: "шагами" },
      { exerciseId: "walkout", volume: "8-10", load: "свой вес", cue: "контроль" },
      { exerciseId: "shadow-boxing", volume: "60 сек", load: "утяжелители 1 кг или без веса", cue: "лёгкие удары" },
    ],
  },
];

export const progression: ProgressionBlock[] = [
  { weeks: "1-2", focus: "Техника", barbell: "штанга 10-12 кг общим весом", intensity: "2-3 повтора в запасе", cue: "Руки и плечи не веди до отказа." },
  { weeks: "3-4", focus: "Нагрузка", barbell: "штанга 12-15 кг общим весом", intensity: "1-2 повтора в запасе", cue: "Добавляй вес или плотность резинки только при чистой технике." },
  { weeks: "5-6", focus: "Плотность", barbell: "штанга 15-18 кг общим весом", intensity: "последний подход почти до отказа", cue: "Ноги сильные, но поясницу не добивай." },
  { weeks: "7-8", focus: "Финальный блок", barbell: "штанга 18-20 кг общим весом", intensity: "около отказа в ключевых", cue: "Стоп, если ломается форма или плечи тянут шею." },
];

export const warmupSteps: WarmupStep[] = [
  {
    id: "mobility",
    title: "Суставная разминка",
    duration: "2 мин",
    details: "Плечи, грудной отдел, таз и голеностоп. Движения мягкие, без рывков.",
  },
  {
    id: "activation",
    title: "Активация мышц",
    duration: "3 мин",
    details: "Сведение лёгкой резинки 2×15, ягодичный мост с тканевой резинкой 2×12, мёртвый жук 1×10 на сторону.",
  },
  {
    id: "ramp-up",
    title: "Подводящий подход",
    duration: "3-5 мин",
    details: "1-2 лёгких подхода первого упражнения: половина рабочего веса штанги или самая лёгкая резинка с ручками.",
  },
];

export const meals: MealBlock[] = [
  {
    id: "breakfast",
    title: "Завтрак",
    target: "30-40 г белка",
    options: [
      {
        id: "eggs-cottage",
        title: "Омлет + творог",
        description: "2 яйца, 150 г творога или греческого йогурта, овощи, цельнозерновой тост.",
        kcal: 520,
        protein: 40,
        fat: 22,
        carbs: 42,
        tags: ["сытно", "много белка"],
      },
      {
        id: "oats-berries",
        title: "Овсянка с ягодами",
        description: "60 г овсянки, творог, ягоды, 10 г орехов. Хорошо перед верхней тренировкой.",
        kcal: 500,
        protein: 34,
        fat: 14,
        carbs: 62,
        tags: ["до тренировки", "углеводы"],
      },
      {
        id: "cottage-toast",
        title: "Творог + тост",
        description: "250 г творога, ягоды, 10 г мёда, цельнозерновой тост.",
        kcal: 470,
        protein: 42,
        fat: 11,
        carbs: 50,
        tags: ["быстро", "лёгко"],
      },
      {
        id: "protein-pancakes",
        title: "Блинчики из овсянки + творог",
        description: "2 блина из овсянки и яйца, 150 г творога, ягоды.",
        kcal: 510,
        protein: 38,
        fat: 16,
        carbs: 54,
        tags: ["выходные", "сладкое"],
      },
      {
        id: "no-breakfast",
        title: "Не из меню",
        description: "Съела что-то другое — добавь продукты в блок «Вне меню».",
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        tags: ["своё"],
      },
    ],
  },
  {
    id: "lunch",
    title: "Обед",
    target: "35-45 г белка",
    options: [
      {
        id: "turkey-rice",
        title: "Индейка + рис",
        description: "Индейка 160 г, рис или гречка, большой овощной салат, 1 ч. л. оливкового масла.",
        kcal: 650,
        protein: 46,
        fat: 17,
        carbs: 78,
        tags: ["база", "после тренировки"],
      },
      {
        id: "beef-potato",
        title: "Говядина + картофель",
        description: "Нежирная говядина 150 г, картофель 250 г, овощи.",
        kcal: 610,
        protein: 39,
        fat: 18,
        carbs: 69,
        tags: ["железо", "сытно"],
      },
      {
        id: "chicken-pasta",
        title: "Паста + курица",
        description: "Паста из твёрдых сортов, курица 150 г, овощи, томатный соус.",
        kcal: 670,
        protein: 45,
        fat: 14,
        carbs: 88,
        tags: ["энергия", "без рыбы"],
      },
      {
        id: "turkey-bowl",
        title: "Боул с индейкой",
        description: "Индейка 150 г, киноа или гречка, огурцы, помидоры, хумус 1 ст. л.",
        kcal: 630,
        protein: 44,
        fat: 16,
        carbs: 72,
        tags: ["свежо", "удобно"],
      },
      {
        id: "no-lunch",
        title: "Не из меню",
        description: "Съела что-то другое — добавь продукты в блок «Вне меню».",
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        tags: ["своё"],
      },
    ],
  },
  {
    id: "dinner",
    title: "Ужин",
    target: "30-40 г белка",
    options: [
      {
        id: "chicken-salad",
        title: "Курица + салат",
        description: "Курица или индейка 160 г, овощи, оливковое масло или авокадо.",
        kcal: 520,
        protein: 43,
        fat: 22,
        carbs: 34,
        tags: ["лёгкий", "овощи"],
      },
      {
        id: "omelet-salad",
        title: "Омлет + салат",
        description: "2 яйца, белки или творог, большой салат. Хорошо в день без тренировки.",
        kcal: 480,
        protein: 36,
        fat: 24,
        carbs: 28,
        tags: ["без мяса", "вечер"],
      },
      {
        id: "cottage-evening",
        title: "Творог + ягоды",
        description: "250 г творога, ягоды. Вариант, когда нужен лёгкий ужин.",
        kcal: 390,
        protein: 40,
        fat: 10,
        carbs: 35,
        tags: ["быстро", "лёгко"],
      },
      {
        id: "turkey-veggies",
        title: "Индейка + тушёные овощи",
        description: "Индейка 160 г, кабачок, перец, брокколи, 1 ч. л. масла.",
        kcal: 490,
        protein: 41,
        fat: 18,
        carbs: 38,
        tags: ["сытно", "овощи"],
      },
      {
        id: "no-dinner",
        title: "Не из меню",
        description: "Съела что-то другое — добавь продукты в блок «Вне меню».",
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        tags: ["своё"],
      },
    ],
  },
  {
    id: "snack",
    title: "Перекус",
    target: "15-25 г белка",
    options: [
      {
        id: "yogurt-nuts",
        title: "Йогурт + орехи",
        description: "150 г греческого йогурта, 15 г миндаля или грецких орехов.",
        kcal: 220,
        protein: 16,
        fat: 12,
        carbs: 14,
        tags: ["быстро", "до тренировки"],
      },
      {
        id: "cottage-fruit",
        title: "Творог + фрукт",
        description: "150 г творога, яблоко или банан.",
        kcal: 240,
        protein: 22,
        fat: 6,
        carbs: 28,
        tags: ["лёгкий", "сладкое"],
      },
      {
        id: "protein-shake",
        title: "Протеин + банан",
        description: "1 порция протеина на воде или молоке, половина банана.",
        kcal: 280,
        protein: 28,
        fat: 4,
        carbs: 32,
        tags: ["после тренировки", "белок"],
      },
      {
        id: "no-snack",
        title: "Без перекуса",
        description: "Если основные приёмы уже закрывают цель по калориям и белку.",
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        tags: ["не нужен"],
      },
    ],
  },
];

export const shoppingItems = [
  "яйца - 20 шт.",
  "творог/греческий йогурт - 1.5-2 кг",
  "курица/индейка - 1.5-2 кг",
  "нежирная говядина - 500-700 г",
  "рис/гречка/овсянка/паста",
  "овощи - 3-5 кг",
  "ягоды/фрукты - 1.5-2 кг",
  "орехи - 150-200 г",
  "протеин / греческий йогурт для перекусов",
  "оливковое масло/авокадо",
];

export const defaultPlaylists: Playlist[] = [
  {
    id: "warmup",
    title: "Разминка",
    mood: "спокойный темп",
    bpm: "95–115",
    url: "https://music.yandex.ru/",
  },
  {
    id: "glutes",
    title: "Силовая",
    mood: "средний темп",
    bpm: "110–130",
    url: "https://music.yandex.ru/",
  },
  {
    id: "fullbody",
    title: "Круговая",
    mood: "энергичный темп",
    bpm: "120–140",
    url: "https://music.yandex.ru/",
  },
];
