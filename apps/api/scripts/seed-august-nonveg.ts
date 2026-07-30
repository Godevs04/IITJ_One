import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb } from '../src/db';
import { publishMessMenu } from '../src/store';
import { initFallbackStore, getFallbackState } from '../src/store/fallback';
import type { MessMenuInput, MessMenuDoc } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const augustNonVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'non-veg',
  month: 8,
  year: 2026,
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Bhindi Peanut Fry', 'Malai Kofta', 'Moong dal'],
          nonVegItems: ['Seasonal fruits (2 Types)', 'Masala Chaas'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Dhokla or khandvi(Besan)', 'Mirchi Chutney', 'Imli Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Ghugni', 'Sabut Masoor dal', 'Moong dal barfi (2 Piece)'],
          nonVegItems: ['Egg Burji'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
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
          vegItems: ['Masala paratha', 'Mix sabji', 'pudhina chutney'],
          nonVegItems: ['Banana(2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Veg Korma', 'Methi Matar Malai', 'Urad chilka dal'],
          nonVegItems: ['Curd', 'Roohhafza'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo Samosa or Aloo tikki chat', 'Chutney', 'dahi', 'chole'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Soyachunks gravy', 'Tinde ki Sabji', 'Dal Makhani', 'Lemon Rice'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
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
          vegItems: ['Uttapam or Namkeen siwaiya', 'Sambhar', 'Coconut Chutney'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Aloo parval', 'Baigan ka bharta', 'Mix dal'],
          nonVegItems: ['Veg Raita', 'Rasna'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Pasta or maggi', 'Chutney or ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mix Veg', 'Masoor dal', 'Fruit Custard'],
          nonVegItems: ['Butter Chiken'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
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
          vegItems: ['Masala Poori', 'Chole or Safed Mattar ki Sabzi and Kheer'],
          nonVegItems: ['Banana(2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Kadi Pakora', 'Aloo-Jeera', 'Kali massor Dal'],
          nonVegItems: ['Seasonal fruits( amrood or pears  or apple)', 'Lassi'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Cheese Grilled Sandwich (2pcs)', 'ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Pindi Chola', 'Soyachunks matar Masala', 'Lobia dal', 'Veg Pulao'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: [
            'Idli+Fried Idli or Idli+Mendu Vada',
            'Sambhar',
            'Coconut Chutney',
            'Tomato Chutney',
          ],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Lauki channa', 'Arbi', 'Rajma dal'],
          nonVegItems: ['Pudina Chaas', 'Aam panna'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Pyaz kachori or Moong Dal kachori', 'Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Sev Tamatar', 'Dal Fry', 'Veg Biryani', 'Rasmalai(2 Piece)'],
          nonVegItems: ['Egg Butter Masala'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Dal stuffed paratha', 'kala Chaane ki saabji'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Gawar fali sabji', 'mix Veg Pakoda', 'Moong dal'],
          nonVegItems: ['Curd', 'Roohhafza'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Dahi papdi chat Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Soya Masala dry', 'Chole Bhature', 'Dal Tadka'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Coconut Chutney', 'sambhar'],
          nonVegItems: ['Boiled Egg (2)'],
          compulsoryItems: [
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita',
          ],
        },
        lunch: {
          vegItems: ['Veg fried Rice', 'Kaddu masala', 'Green moong chilka', 'Manchurian'],
          nonVegItems: ['Boondi Raita pudina'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Paani puri', 'emili pani'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Korma', 'Arhar Dal', 'Ice cream(Chocolate or Butterscotch)'],
          nonVegItems: ['Chicken Biryani', 'veg Raita'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Lizzat',
            'Ghee',
          ],
        },
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('[seed] Seeding August 2026 Non-Veg Mess Menu...');
  try {
    await connectDb();
    const version = await publishMessMenu(
      augustNonVegMenu,
      augustNonVegMenu,
      'admin@iitjone.in',
    );
    console.log(`[seed] August 2026 Non-Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.warn('[seed] MongoDB seeding failed or unavailable, seeding in-memory fallback:', (err as Error).message);
    initFallbackStore();
    const s = getFallbackState();
    const now = new Date().toISOString();
    const doc: MessMenuDoc = {
      ...augustNonVegMenu,
      status: 'published',
      version: (s.messMenuNonVeg?.version ?? 0) + 1,
      publishedAt: now,
      publishedBy: 'admin@iitjone.in',
      updatedAt: now,
      updatedBy: 'admin@iitjone.in',
    };
    s.messMenuNonVeg = doc;
    console.log(`[seed] In-memory fallback updated with August 2026 Non-Veg Mess Menu v${doc.version}`);
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
