import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb } from '../src/db';
import { publishMessMenu } from '../src/store';
import { initFallbackStore, getFallbackState } from '../src/store/fallback';
import type { MessMenuInput, MessMenuDoc } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const augustVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'veg',
  month: 8,
  year: 2026,
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi/ Dalia'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Curd rice', 'Chana+Arhar daal', 'Kala chana', 'Bhindi peanut fry'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Rasna',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Samosa', 'chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Dal Makhani', 'Capsicum-Aloo Masala'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: {
          vegItems: ['Sewai Upma', 'Chatni'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Dal Panchmahal', 'Veg Korma', 'Sev tamatar ki sabji'],
          nonVegItems: [],
          compulsoryItems: [
            'Mango',
            'Jeera - Chhach',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad/Aloo masala chips',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo grilled sandwich'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lemon Rice', 'Mix Dal', 'Aaloo Mutter Masala', 'Lauki Chana', 'Kheer'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Idli+Fried Idli / Idli+Mendu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Masoor Dal', 'Besan Gatte ki sabji', 'Bhindi Do Pyaza'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Roohaafza',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Bhelpuri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lasooni Dal Tadka', 'Aloo Pyaaj ki  Sabji'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Poori', 'aalu tamatar Sabzi'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Channa Dal Fry', 'Curry Pakoda', 'Dahi Chauli'],
          nonVegItems: [],
          compulsoryItems: [
            'Veg raita',
            'Nimboo pani',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Veg-cutlet'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Khichdi',
            'Masoor Dal',
            'Dry Tinda Masala',
            'Lobiya',
            'Milk barfi (2 pieces)/ Fruit custard',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: ['Pongal with sambhar and chutney /Uttapam', 'Sambhar', 'Coconut Chutney'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Rajma Dal', 'Aloo matar tamatar', 'Mix Veg Dry'],
          nonVegItems: [],
          compulsoryItems: [
            'Mango',
            'Butter Milk',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo - tikki chaat'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mong  Dal', 'Veg Biriyani', 'Pindi chole'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Aloo Pyaz Paratha', 'Curd', 'Mint Chutney', 'Pickle'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Veg pakoda Sabji', 'Dal tadka', 'Gawarfalii'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Roohhafza',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Maggie/Veg Noodles'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Veg Pulao',
            'Dal Tadka',
            'Chole Bhature',
            'Dry Aloo Masala',
            'Ice cream (Butterscotch/ Chocolate)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Sambhar'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Veg Fried Rice', 'Dal Makhani', 'Green Mung chilka', 'Veg manchurian'],
          nonVegItems: [],
          compulsoryItems: [
            'Bundi Raita',
            'Nimboo Pani',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Pani-Puri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Plain rice', 'Chana Dal tadka', 'white chola', 'Gulab jamun(2 piece)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('[seed] Seeding August 2026 Veg Mess Menu...');
  try {
    await connectDb();
    const version = await publishMessMenu(
      augustVegMenu,
      augustVegMenu,
      'admin@iitjone.in',
    );
    console.log(`[seed] August 2026 Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.warn('[seed] MongoDB seeding failed or unavailable, seeding in-memory fallback:', (err as Error).message);
    initFallbackStore();
    const s = getFallbackState();
    const now = new Date().toISOString();
    const doc: MessMenuDoc = {
      ...augustVegMenu,
      status: 'published',
      version: (s.messMenuVeg?.version ?? 0) + 1,
      publishedAt: now,
      publishedBy: 'admin@iitjone.in',
      updatedAt: now,
      updatedBy: 'admin@iitjone.in',
    };
    s.messMenuVeg = doc;
    console.log(`[seed] In-memory fallback updated with August 2026 Veg Mess Menu v${doc.version}`);
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
