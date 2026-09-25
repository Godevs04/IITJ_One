import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Source: September-menu/September_Non-Veg Menu 2026.xlsx
 * Generated from the mess office sheet.
 * Egg/chicken dishes from the sheet's extras column are classified into nonVegItems.
 */
const septemberNonVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'non-veg',
  month: 9,
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
          vegItems: ['Bhindi Peanut Fry', 'Malai Kofta', 'Lasooni Dal Tadka', 'Seasonal fruits', 'Masala Chaas(200ml)'],
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
          vegItems: ['Dhokla', 'Mirchi Chutney', 'Imli Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Ghugni', 'Sabut Masoor dal', 'Gulab jamun (2 Piece)'],
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
          vegItems: ['Paratha', 'Black Channa Sabji', 'green chutney', 'Banana(2)'],
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
          vegItems: ['Aloo banigan(dry)', 'Methi Matar Malai', 'Dal Dhoi Ki', 'Curd(100ml)', 'Roohhafza'],
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
          vegItems: ['Vada Pav', 'Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Soyachunks gravy', 'Mix Veg', 'Dal Makhani', 'Lemon Rice'],
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
          vegItems: ['Chilli Soya', 'Tinde ki Sabji', 'Moong-Masoor Dal', 'Veg Raita(200ml)', 'Orange Rasna'],
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
          vegItems: ['Maggi or Pasta', 'ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Aloo Parval(dry)', 'Masoor dal', 'Fruit Custard'],
          nonVegItems: ['Butter Chiken'],
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
          vegItems: ['Ajwain Poori', 'Chole or Safed Mattar ki Sabzi and Kheer', 'Banana(2)'],
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
          vegItems: ['Kadi Pakora', 'Aloo-Jeera', 'Kali massor Dal', 'Seasonal fruits', 'Sweet Lassi(200ml)'],
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
          vegItems: ['Sandwich(Veg or Aloo) (2pcs)', 'ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Punjabi Chole', 'khatta Metha Kaddu', 'Green moong chilka', 'Veg Pulao'],
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
          vegItems: ['Idli+Fried Idli or Idli+Mendu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney'],
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
          vegItems: ['Lauki channa', 'Kashmiri Dum aloo', 'Rajma dal', 'Pudina Chaas(200ml)', 'Rose sharbat'],
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
          vegItems: ['Sev Tamatar or Papad ki Sabji', 'Dal Fry', 'Veg Biryani', 'Rasmalai(2 Piece)'],
          nonVegItems: ['Egg Butter Masala'],
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
          vegItems: ['Aloo Pyaaz paratha', 'Chutney', 'Dahi'],
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
          vegItems: ['Capsicum Masala', 'mix Veg Pakoda', 'Moong dal', 'Curd(100ml)', 'Roohhafza'],
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
          vegItems: ['Dahi papdi chat Chutney', 'Chole'],
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
          vegItems: ['Veg fried Rice', 'Cabbage mattar', 'Lobia Dal', 'Manchurian', 'Boondi Raita pudina(200ml)'],
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
          vegItems: ['Paani puri', 'Dahi', 'emili pani'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Korma', 'Arhar Dal', 'Ice cream(Butterscotch/Chocolate)', 'veg Raita(200ml)'],
          nonVegItems: ['Chicken Biryani'],
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
  console.log('[seed] Seeding September 2026 Non-Veg Mess Menu...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(septemberNonVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuNonVeg;
    const version = await publishMessMenu(
      septemberNonVegMenu,
      septemberNonVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] September 2026 Non-Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
