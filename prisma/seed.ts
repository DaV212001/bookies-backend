import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    console.log('⚠️ Skipping database seeding in production environment.');
    return;
  }
  console.log('🌱 Seeding database with contemporary book club favorites...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@bookies.app' },
    update: {},
    create: {
      id: 'user-1',
      email: 'alice@bookies.app',
      username: 'bookworm',
      displayName: 'Alice Reader',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    },
  });

  const julian = await prisma.user.upsert({
    where: { email: 'julian@bookies.app' },
    update: {},
    create: {
      id: 'user-2',
      email: 'julian@bookies.app',
      username: 'julian',
      displayName: 'Julian Morrow',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=julian',
    },
  });

  const henry = await prisma.user.upsert({
    where: { email: 'henry@bookies.app' },
    update: {},
    create: {
      id: 'user-3',
      email: 'henry@bookies.app',
      username: 'henry',
      displayName: 'Henry Winter',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=henry',
    },
  });

  // 2. Seed Community
  await prisma.community.upsert({
    where: { id: 'comm-1' },
    update: {},
    create: {
      id: 'comm-1',
      name: 'The Secret History',
      description: 'A reading community exploring Donna Tartt’s debut masterpiece.',
      bookId: 'mock-book-1',
      creatorId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'creator', status: 'active' },
          { userId: julian.id, role: 'admin', status: 'active' },
          { userId: henry.id, role: 'member', status: 'active' },
        ],
      },
    },
  });

  // 3. Seed Contemporary & Trending Bestseller Books
  const contemporaryBooks = [
    {
      title: 'The Secret History',
      author: 'Donna Tartt',
      coverUrl:
        'https://covers.openlibrary.org/b/id/12838977-L.jpg',
      genres: ['DarkAcademia', 'ClassicPoetry', 'PhilosophicalFiction', 'Fiction'],
      activeReadersCount: 1420,
      rating: 4.9,
      description:
        'Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.',
    },
    {
      title: 'Klara and the Sun',
      author: 'Kazuo Ishiguro',
      coverUrl:
        'https://covers.openlibrary.org/b/id/10524419-L.jpg',
      genres: ['SciFiEpics', 'PhilosophicalFiction', 'Dystopian'],
      activeReadersCount: 842,
      rating: 4.6,
      description:
        'A thrilling book that offers a look at our changing world through the eyes of an unforgettable narrator, exploring the fundamental question: what does it mean to love?',
    },
    {
      title: 'Circe',
      author: 'Madeline Miller',
      coverUrl:
        'https://covers.openlibrary.org/b/id/8315891-L.jpg',
      genres: ['ModernClassics', 'ClassicPoetry', 'Mythology', 'Fantasy'],
      activeReadersCount: 960,
      rating: 4.8,
      description:
        'In the house of Helios, god of the sun and mightiest of the Titans, a daughter is born. But Circe is a strange child—not powerful, like her father, nor viciously alluring like her mother.',
    },
    {
      title: 'The Song of Achilles',
      author: 'Madeline Miller',
      coverUrl:
        'https://covers.openlibrary.org/b/id/8235106-L.jpg',
      genres: ['ModernClassics', 'ClassicPoetry', 'HistoricalFiction'],
      activeReadersCount: 1105,
      rating: 4.9,
      description:
        'Greece in the age of heroes. Patroclus, an awkward young prince, has been exiled to the court of King Peleus and his perfect son Achilles. Despite their differences, Achilles befriends the shamed prince.',
    },
    {
      title: 'Tomorrow, and Tomorrow, and Tomorrow',
      author: 'Gabrielle Zevin',
      coverUrl:
        'https://covers.openlibrary.org/b/id/12843514-L.jpg',
      genres: ['ModernClassics', 'Fiction', 'Contemporary'],
      activeReadersCount: 1350,
      rating: 4.8,
      description:
        'On a bitter-cold day, in the December of his junior year at Harvard, Sam Masur exits a subway car and sees, amid the hordes of people waiting on the platform, Sadie Green.',
    },
    {
      title: 'Babel: Or the Necessity of Violence',
      author: 'R.F. Kuang',
      coverUrl:
        'https://covers.openlibrary.org/b/id/12884102-L.jpg',
      genres: ['DarkAcademia', 'HistoricalFiction', 'Fantasy'],
      activeReadersCount: 1040,
      rating: 4.7,
      description:
        'Traduttore, traditore: An act of translation is always an act of betrayal. 1828. An orphaned boy brought to London from Canton is trained in Latin, Ancient Greek, and Chinese at Oxford’s Royal Institute of Translation.',
    },
    {
      title: 'Yellowface',
      author: 'R.F. Kuang',
      coverUrl:
        'https://covers.openlibrary.org/b/id/13444062-L.jpg',
      genres: ['ModernClassics', 'Satire', 'Thriller'],
      activeReadersCount: 1210,
      rating: 4.6,
      description:
        'Athena Liu is a literary darling and June Hayward is literally nobody. When June witnesses Athena’s freak death in a freak accident, she steals Athena’s just-finished masterpiece about Chinese laborers in WWI.',
    },
    {
      title: 'Fourth Wing',
      author: 'Rebecca Yarros',
      coverUrl:
        'https://covers.openlibrary.org/b/id/13854124-L.jpg',
      genres: ['SciFiEpics', 'Fantasy', 'Romance'],
      activeReadersCount: 2150,
      rating: 4.8,
      description:
        'Twenty-year-old Violet Sorrengail was supposed to enter the Scribe Quadrant, living a quiet life among books. Now, the commanding general has ordered Violet to join the hundreds of candidates striving to become the dragon riders.',
    },
    {
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      coverUrl:
        'https://covers.openlibrary.org/b/id/10574889-L.jpg',
      genres: ['SciFiEpics', 'ScienceFiction', 'Adventure'],
      activeReadersCount: 1820,
      rating: 4.9,
      description:
        'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself are doomed. Except right now, he doesn’t know that. He can’t even remember his own name.',
    },
    {
      title: 'A Little Life',
      author: 'Hanya Yanagihara',
      coverUrl:
        'https://covers.openlibrary.org/b/id/7949514-L.jpg',
      genres: ['ModernClassics', 'PhilosophicalFiction', 'LiteraryFiction'],
      activeReadersCount: 970,
      rating: 4.7,
      description:
        'When four classmates from a small Massachusetts college move to New York to make their way, they’re broke, adrift, and buoyed only by their friendship and ambition.',
    },
    {
      title: 'Normal People',
      author: 'Sally Rooney',
      coverUrl:
        'https://covers.openlibrary.org/b/id/8757422-L.jpg',
      genres: ['ModernClassics', 'Contemporary', 'Romance'],
      activeReadersCount: 1140,
      rating: 4.5,
      description:
        'Connell and Marianne grow up in the same small town in the west of Ireland, but the similarities end there. When they both attend Trinity College in Dublin, a unique connection forms between them.',
    },
    {
      title: 'The Midnight Library',
      author: 'Matt Haig',
      coverUrl:
        'https://covers.openlibrary.org/b/id/10432570-L.jpg',
      genres: ['PhilosophicalFiction', 'Fantasy', 'Contemporary'],
      activeReadersCount: 1680,
      rating: 4.6,
      description:
        'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.',
    },
    {
      title: 'The Overstory',
      author: 'Richard Powers',
      coverUrl:
        'https://covers.openlibrary.org/b/id/8410214-L.jpg',
      genres: ['ModernClassics', 'EssayCollections', 'Environmental'],
      activeReadersCount: 389,
      rating: 4.5,
      description:
        'The Overstory is a sweeping, impassioned work of activism and resistance that is also a stunning evocation of the natural world.',
    },
    {
      title: 'Piranesi',
      author: 'Susanna Clarke',
      coverUrl:
        'https://covers.openlibrary.org/b/id/10255288-L.jpg',
      genres: ['DarkAcademia', 'Fantasy', 'Mystery'],
      activeReadersCount: 890,
      rating: 4.8,
      description:
        'Piranesi’s house is no ordinary building: its rooms are infinite, its corridors endless, its walls are lined with thousands upon thousands of statues. Within the labyrinth of halls an ocean is imprisoned.',
    },
    {
      title: 'Dune',
      author: 'Frank Herbert',
      coverUrl:
        'https://covers.openlibrary.org/b/id/12745330-L.jpg',
      genres: ['SciFiEpics', 'ScienceFiction', 'Classics'],
      activeReadersCount: 2450,
      rating: 4.9,
      description:
        'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
    },
  ];

  for (const b of contemporaryBooks) {
    let existing = await prisma.catalogBook.findFirst({
      where: { title: b.title, author: b.author },
    });

    if (!existing) {
      existing = await prisma.catalogBook.create({ data: b });
    }

    // Explicitly populate downloadUrl
    await prisma.catalogBook.update({
      where: { id: existing.id },
      data: {
        ...b,
        downloadUrl: `/api/v1/catalog/${existing.id}/download`,
      },
    });
  }

  console.log(`✅ Seeded ${contemporaryBooks.length} contemporary books into PostgreSQL!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
