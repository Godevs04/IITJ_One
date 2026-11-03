import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Source: November-menu/November month veg mess menu.xlsx
 * Generated from the mess office sheet.
 * Jain-column dishes are carried as "... (Jain)" entries in vegItems, since the menu schema has no Jain field yet.
 */
const novemberVegMenu: MessMenuInput = {
  campusId: 'iitj',
  menuType: 'veg',
  month: 11,
  year: 2026,
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha (Aloo/Sev)', 'Mint Chutney', 'Jalebi'],
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
          vegItems: ['Moong Dal', 'Soya bean dry', 'Veg Manchurian', 'Seasonal Fruits( Papaya+Apple+Guava)'],
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
          vegItems: ['Dhokla', 'Chutney(Mint)'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Dal Tadka(Chana)', 'Gobi Masala Dry', 'Aloo beans Curry', 'Beans curry (Jain)'],
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
          vegItems: ['Aloo Methi stuffed Pratha with green chutney', 'Curd'],
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
          vegItems: ['Rajma Dal', 'kaddu dry', 'Hariyali Kofta'],
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
          vegItems: ['Dahi Papdi', 'Chutney(Green+Red)'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Chhole Bhatura', 'Ridged Gourd Daal', 'Aloo Deep fry', 'Ice Cream', 'Matar Paneer (Jain)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Papad/Fryums',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Idli / Fried Idli', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney'],
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
          vegItems: ['Kadhi pakoda', 'Achari Aalo dry', 'Malai Kofta', 'Seasonal Fruits(Watermelon+Pine apple+Apple)'],
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
          vegItems: ['Veg Cutlet/Pakoda', 'Chutney(Green+Red)'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Veg Fried Rice',
            'Urad Dal',
            'Paneer Butter Masala(100 gm paneer)',
            'Cabbage pakoda',
            'Gatte ki sazi (Jain)',
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
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Matar Poori and Sabji', 'Mint Chutney', 'Tomato Chutney'],
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
          vegItems: ['Dal Makhani', 'Aalo Gobi matar dry', 'Dahi Baigan'],
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
          vegItems: ['Samosa', 'Chutney+Sause'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Dal tadka', 'Cauliflower fry', 'Kalakand(2pc)'],
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
          vegItems: ['Uttapam', 'Sambhar', 'Coconut chutney', 'Lusun Chutney'],
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
          vegItems: ['Mix dal', 'Chole Masala', 'Mixed Vegetable dry', 'Seasonal Fruits(Papaya+Guava+Apple)'],
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
          vegItems: ['Pav Bhaji', 'Chutney(Green+Red)', 'Chopped Onion'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Navratan Pulao',
            'Masoor Dal',
            'Kaccha kela dry',
            'Palak Paneer(100 gm paneer)',
            'papad sabzi (Jain)',
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
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Palak Paratha with Korma', 'Curd', 'Tomato Chutney Pickle'],
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
          vegItems: ['Dal (Masoor)', 'Jira+ green dhaniya aloo fry', 'lauki chana gravy', 'Vegitable Mix khichdi'],
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
          vegItems: ['Cheese Sandwich', 'Ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Khichdi', 'Daal Tadka', 'Alu- Baigan', 'Mix veg fry', 'Boondi Rabdi', 'papad sabzi (Jain)'],
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
          vegItems: ['Masala Dosa', 'Sambhar', 'Coconut Chutney', 'Lusun Chutney'],
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
            'Channa dal fry',
            'Cabbage matar Fry',
            'White matar chhola',
            'Seasonal Fruits(Watermelon+Pine Apple+Guava)',
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
          vegItems: ['Pani Puri with mashed masala aloo and chana'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Lasooni Daal Tadka',
            'Aalo palak dry',
            'Moong masala(semi gravy)',
            'Paneer Biryani(150 gm Paneer)',
            'Rasmalai(2pc)',
            'kaccha kela (Jain)',
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
  console.log('[seed] Seeding November 2026 Veg Mess Menu...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(novemberVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuVeg;
    const version = await publishMessMenu(
      novemberVegMenu,
      novemberVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] November 2026 Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
