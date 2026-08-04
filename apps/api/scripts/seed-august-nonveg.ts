import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

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
          vegItems: ['Bhindi Peanut Fry', 'Malai Kofta', 'Moong dal', 'Seasonal fruits (2 Types)', 'Masala Chaas'],
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
          vegItems: ['Masala paratha', 'Mix sabji', 'pudhina chutney', 'Banana(2)'],
          nonVegItems: [],
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
          vegItems: ['Veg Korma', 'Methi Matar Malai', 'Urad chilka dal', 'Curd', 'Roohhafza'],
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
        snacks: {
          vegItems: ['Aloo Samosa or Aloo tikki chat', 'Chutney', 'dahi', 'chole'],
          nonVegItems: [],
          compulsoryItems: [
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
          ],
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
          vegItems: ['Aloo parval', 'Baigan ka bharta', 'Mix dal', 'Veg Raita', 'Rasna'],
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
        snacks: {
          vegItems: ['Pasta or maggi', 'Chutney or ketchup'],
          nonVegItems: [],
          compulsoryItems: [
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
          ],
        },
        dinner: {
          vegItems: ['Mix Veg', 'Masoor dal', 'Fruit Custard'],
          nonVegItems: ['Butter Chicken'],
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
          vegItems: ['Masala Poori', 'Chole or Safed Mattar ki Sabzi and Kheer', 'Banana(2)'],
          nonVegItems: [],
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
          vegItems: ['Kadi Pakora', 'Aloo-Jeera', 'Kali massor Dal', 'Seasonal fruits (amrood or pears or apple)', 'Lassi'],
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
          vegItems: ['Lauki channa', 'Arbi', 'Rajma dal', 'Pudina Chaas', 'Aam panna'],
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
          vegItems: ['Gawar fali sabji', 'mix Veg Pakoda', 'Moong dal', 'Curd', 'Roohhafza'],
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
          vegItems: ['Veg fried Rice', 'Kaddu masala', 'Green moong chilka', 'Manchurian', 'Boondi Raita pudina'],
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
        snacks: {
          vegItems: ['Paani puri', 'emili pani'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Korma', 'Arhar Dal', 'Ice cream(Chocolate or Butterscotch)', 'veg Raita'],
          nonVegItems: ['Chicken Biryani'],
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
  ],
};

async function main(): Promise<void> {
  console.log('[seed] Seeding August 2026 Non-Veg Mess Menu...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(augustNonVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuNonVeg;
    const version = await publishMessMenu(
      augustNonVegMenu,
      augustNonVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] August 2026 Non-Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
