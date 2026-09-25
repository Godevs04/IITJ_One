import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Source: September-menu/september month veg mess menu.xlsx
 * Generated from the mess office sheet — Jain-column variants are folded into
 * vegItems with a "(Jain)" suffix, since the menu schema has no Jain field yet.
 */
const septemberVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'veg',
  month: 9,
  year: 2026,
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi', 'Banana (2)'],
          nonVegItems: [],
          compulsoryItems: [
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
          vegItems: ['Chana+Arhar daal', 'Kala chana', 'Aloo Bhindi peanut fry', 'Curd', 'Bhindi peanut fry (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Samosa/ Aloo bonda', 'chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Moong-Masoor Dal', 'Capsicum-Aloo Masala', 'Kadhai Paneer', 'Capsicum masala (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: {
          vegItems: ['Besan Chilla/Savai Upma', 'chatni', 'Banana(2)'],
          nonVegItems: [],
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
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Dal Panchmahal', 'Aloo Matar Cabbage', 'Malai Kofta', 'Fruits', 'Matar cabbage (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo grilled sandwich'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lemon Rice', 'Mix Dal', 'White chola', 'Loki chana', 'Moong Halwa', 'white chola (Jain)'],
          nonVegItems: [],
          compulsoryItems: ['Plain Rice', 'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)', 'Pickle', 'Papad/Fryums', 'Ghee'],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Idli+Fried Idli / Idli+Mendu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney', 'Banana (2)'],
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
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Rajmah Dal', 'Sev tamatar ki sabji', 'Aloo parwal', 'Veg raita', 'Parwal (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Corn chat'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lasooni Dal Tadka', 'Tinda masala', 'Paneer Butter Masala', 'Papad maithidana (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Poori', 'aalu tamatar Sabzi', 'Banana(2)'],
          nonVegItems: [],
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
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Channa Dal Fry', 'Curry Pakoda', 'Aloo bhujia', 'Lassi', 'Moong masala (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Veg-cutlet'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Pulao', 'Lobia', 'Kadu masala', 'Chana+ arhar dal', 'Fruit custard', 'Lobiya (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: ['Uttapam', 'Sambhar', 'Coconut Chutney', 'Banana (2)'],
          nonVegItems: [],
          compulsoryItems: [
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
          vegItems: [
            'Masoor Dal',
            'Aloo Soyabean',
            'Mix Veg Dry',
            'Fruits',
            'mix veg (Tomato,Gwarfali,matar) (Jain)',
            'Soyabean (Jain)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Maggie/Veg Noodles'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mong Dal', 'Veg Biriyani', 'Pindi chole', 'Aaloo Bangan dry', 'Pindi chole (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Aloo Pyaz Paratha', 'Curd', 'Mint Chutney', 'Pickle', 'Banana'],
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
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Gatte ki sabji', 'Dal tadka', 'Gawarfali/ kundru-Aloo', 'Jeera Chass', 'Gawarfalii (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Pani-Puri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Plain rice',
            'Chana Dal tadka',
            'Veg korma',
            'Gulab jamun(2 piece)',
            'Matar Paneer',
            'Veg korma (Jain)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Sambhar', 'Banana(2)'],
          nonVegItems: [],
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
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: [
            'Veg Fried Rice',
            'Dal Makhani',
            'Veg manchurian',
            'Kashmiri Dum aloo',
            'Bundi Raita',
            'Tindori masala (Jain)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aaloo-tikki chat'],
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
            'Bhindi (Jain)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad',
            'Ghee',
          ],
        },
      },
    },
  ],
};

async function main(): Promise<void> {
  console.log('[seed] Seeding September 2026 Veg Mess Menu...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(septemberVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuVeg;
    const version = await publishMessMenu(
      septemberVegMenu,
      septemberVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] September 2026 Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
