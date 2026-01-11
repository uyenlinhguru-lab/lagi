
import { CategoryType } from './types';

export const MAX_SCORES = {
  general: {
    topic: 10,
    mention: 10,
    emotion: 15,
    message: 15,
    compliance: 10
  },
  social: {
    like: 8,      // Mới: tối đa 8đ
    share: 6,     // Mới: tối đa 6đ
    comment: 7    // Mới: tối đa 7đ
  },
  specific: {
    criteria1: 8,
    criteria2: 6,
    criteria3: 6
  }
};

// Định mức quy đổi mới
export const SOCIAL_EXCHANGE_RATES = {
  like: 25,    // 25 likes = 1đ (Tối đa 200 lượt = 8đ)
  share: 25,   // 25 shares = 1đ (Tối đa 150 lượt = 6đ)
  comment: 10  // 10 comments = 1đ (Tối đa 70 lượt = 7đ)
};

export const SPECIFIC_CRITERIA_LABELS: Record<CategoryType, { c1: string, c2: string, c3: string }> = {
  [CategoryType.VIDEO]: {
    c1: 'Kịch bản & mạch kể (8đ)',
    c2: 'Hình ảnh & dựng phim (6đ)',
    c3: 'Âm thanh - nhạc nền (6đ)'
  },
  [CategoryType.ARTICLE]: {
    c1: 'Cấu trúc bài viết (8đ)',
    c2: 'Ngôn ngữ & văn phong (6đ)',
    c3: 'Hình ảnh/Video minh họa (6đ)'
  },
  [CategoryType.SONG]: {
    c1: 'Lời bài hát (8đ)',
    c2: 'Giai điệu & hòa âm (6đ)',
    c3: 'Cách thể hiện (6đ)'
  }
};
