import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Source: November-menu/November_Non-Veg Menu 2026.xlsx
 * Generated from the mess office sheet.
 * Egg/chicken dishes from the sheet's extras column are classified into nonVegItems; raita, chaas, banana etc. stay in vegItems.
 */
const novemberNonVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'non-veg',
  month: 11,
  year: 2026,
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Masala Poori', 'Matar Sabzi and Kheer'],
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
          vegItems: ['Gobi Achari', 'kala chana', 'Moong dal', 'Boondi raita(200ml)'],
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
          vegItems: ['Dahi bada', 'Mirchi Chutney', 'Imli Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['khatta Meetha Kaddu', 'Sabut Masoor dal', 'Gulab Jamun'],
          nonVegItems: ['Egg Burji'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: {
          vegItems: ['Idli+Fried Idli or Idli+Medu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney', 'Banana(2)'],
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
          vegItems: ['Chana dal', 'Kashmiri Dum aloo', 'Aloo palak', 'Curd(100ml)'],
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
          vegItems: ['Aloo tikki', 'dahi', 'chole', 'Chutney', 'onion'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Methhi Matar Malai', 'Mix Veg', 'Dal Makhani', 'Jeera Rice'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Poha', 'Sambar and Jalebi'],
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
          vegItems: ['Malai kofta', 'Cabbage Matar', 'dal palak', 'Veg Raita(200ml)'],
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
          vegItems: ['Pani puri', 'Imili pani'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Aloo Kundru(dry)', 'Dal Fry', 'Shahi Tukda with rabri'],
          nonVegItems: ['Chicken Butter Masala'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Methi Paratha', 'Aloo-matar ki Sabji', 'Dahi', 'Banana(2)'],
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
          vegItems: ['Kadi Pakora', 'Aloo-chokha', 'Lobiya Dal', 'Sweet Lassi(200ml)'],
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
          vegItems: ['Maggi', 'ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mix Veg', 'veg manchurian', 'Channa Dal', 'Biryani'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: ['Uttapam', 'Sambhar', 'Coconut Chutney'],
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
          vegItems: ['Rajma', 'Gajar-beans-gobi sabzi', 'Dahi Aloo', 'Pudina Chaas(200ml)'],
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
          vegItems: ['Veg Sandwich', 'ketchup', 'Seasonal fruits'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Capsicum aloo', 'Dal Fry', 'Veg Biryani', 'Khoya Barfi'],
          nonVegItems: ['Egg Curry with green peas and aloo'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Coconut Chutney', 'Sambhar'],
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
          vegItems: ['Hariyali Kofta', 'Gajar Matar sabzi', 'Lasooni Dal Tadka (arhar)', 'Curd(100ml)'],
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
          vegItems: ['Vada pao + chutney or Pao Bhaji+lemon+onion'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Aloo spring onion fry', 'Chole Bhature', 'Dal Tadka (mix)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Aloo Pyaaz paratha', 'Chutney', 'Dahi'],
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
          vegItems: ['Soya Chunk', 'Gobi matar masala', 'Green moong dal', 'Birista rice', 'Masala Chass(200ml)'],
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
          vegItems: ['Bread pakoda or Dal ke pakode', 'Chutney', 'Seasonal fruits'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Korma', 'Arhar Dal', 'Ice cream(Butterscotch)', 'Veg Fried Rice', 'veg Raita(200ml)'],
          nonVegItems: ['Chilly Chicken or Chicken curry'],
          compulsoryItems: [
            'Plain Rice',
            'Atta Roti',
            'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)',
            'Pickle',
            'Fryums',
            'Ghee',
          ],
        },
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('[seed] Seeding November 2026 Non-Veg Mess Menu...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(novemberNonVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuNonVeg;
    const version = await publishMessMenu(
      novemberNonVegMenu,
      novemberNonVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] November 2026 Non-Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
