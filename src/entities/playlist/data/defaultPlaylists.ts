import type { Playlist } from "../model/types";

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
