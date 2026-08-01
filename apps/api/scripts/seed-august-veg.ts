import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { publishMessMenu, getMeta } from '../src/store';
import type { MessMenuInput } from '@iitj1/types';

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
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi/ Dalia', 'Banana (2)'],
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
          vegItems: ['Curd rice', 'Chana+Arhar daal', 'Kala chana', 'Bhindi peanut fry', 'Curd', 'Rasna'],
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
        snacks: {
          vegItems: ['Samosa', 'chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Dal Makhani', 'Capsicum-Aloo Masala', 'Kadhai Paneer'],
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
          vegItems: ['Sewai Upma', 'Chatni', 'Banana(2)'],
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
          vegItems: ['Dal Panchmahal', 'Veg Korma', 'Sev tamatar ki sabji', 'Mango', 'Jeera - Chhach'],
          nonVegItems: [],
          compulsoryItems: [
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
          vegItems: ['Masoor Dal', 'Besan Gatte ki sabji', 'Bhindi Do Pyaza', 'Curd', 'Roohaafza'],
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
        snacks: {
          vegItems: ['Bhelpuri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lasooni Dal Tadka', 'Aloo Pyaaj ki Sabji', 'Papad maithidana', 'Paneer Butter Masala'],
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
          vegItems: ['Channa Dal Fry', 'Curry Pakoda', 'Dahi Chauli', 'Veg raita', 'Nimboo pani'],
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
          vegItems: ['Pongal with sambhar and chutney /Uttapam', 'Sambhar', 'Coconut Chutney', 'Banana (2)'],
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
          vegItems: ['Rajma Dal', 'Aloo matar tamatar', 'Mix Veg Dry', 'Mango', 'Butter Milk'],
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
        snacks: {
          vegItems: ['Aloo - tikki chaat'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mong Dal', 'Veg Biriyani', 'Pindi chole', 'Paneer Lababdar'],
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
          vegItems: ['Veg pakoda Sabji', 'Dal tadka', 'Gawarfalii', 'Papad maithidana', 'Curd', 'Roohhafza'],
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
          vegItems: ['Veg Fried Rice', 'Dal Makhani', 'Green Mung chilka', 'Veg manchurian', 'Tindori masala', 'Bundi Raita', 'Nimboo Pani'],
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
        snacks: {
          vegItems: ['Pani-Puri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Plain rice', 'Chana Dal tadka', 'white chola', 'Gulab jamun(2 piece)', 'Paneer Shimla Dry'],
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
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const meta = await getMeta(augustVegMenu.campusId);
    const expectedVersion = meta.versions.messMenuVeg;
    const version = await publishMessMenu(
      augustVegMenu,
      augustVegMenu,
      'admin@iitjone.in',
      expectedVersion,
    );
    console.log(`[seed] August 2026 Veg Mess Menu published successfully! (Version v${version})`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
