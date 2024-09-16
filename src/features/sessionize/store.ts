import { z } from 'zod';
import { serverCache } from '~/db/kv';

const roomSchema = z.object({
  id: z.number(),
  name: z.string(),
  sort: z.number()
});

export type Room = z.infer<typeof roomSchema>;

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  speakers: z.array(z.string()),
  categoryItems: z.array(z.number()),
  roomId: z.number().nullable()
});

export type Session = z.infer<typeof sessionSchema>;

const speakerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  bio: z.string(),
  tagLine: z.string(),
  profilePicture: z.string(),
  links: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      linkType: z.enum([
        'LinkedIn',
        'Blog',
        'Company_Website',
        'Twitter',
        'Facebook',
        'Instagram',
        'Other'
      ])
    })
  ),
  sessions: z.array(z.number()),
  fullName: z.string()
});

export type Speaker = z.infer<typeof speakerSchema>;
export type SpeakerLink = Speaker['links'][number];

const categorySchema = z.object({
  id: z.number(),
  title: z.enum(['Level', 'Tags']),
  items: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      sort: z.number()
    })
  ),
  sort: z.number(),
  type: z.enum(['session'])
});

export type Category = z.infer<typeof categorySchema>;

const sessionizeSchema = z.object({
  sessions: z.array(sessionSchema),
  speakers: z.array(speakerSchema),
  categories: z.array(categorySchema),
  rooms: z.array(roomSchema)
});

export type SessionizeData = z.infer<typeof sessionizeSchema>;

export const getCachedData = serverCache(
  async function () {
    const response = await fetch('https://sessionize.com/api/v2/p0ni4alx/view/All');
    const data = await response.json();
    return sessionizeSchema.parse(data);
  },
  `sessionize`,
  86400000 // 24 hours in milliseconds
);

// const dummyData: SessionizeData = {
//   sessions: [
//     {
//       id: '1',
//       title: 'Introduction to TypeScript',
//       description: "A beginner's guide to using TypeScript in modern web development.",
//       startsAt: '2024-09-10T09:00:00',
//       endsAt: '2024-09-10T10:00:00',
//       speakers: ['1'],
//       categoryItems: [101, 201],
//       roomId: 1
//     },
//     {
//       id: '2',
//       title: 'Advanced JavaScript Patterns',
//       description: 'Explore advanced patterns and techniques in JavaScript.',
//       startsAt: '2024-09-10T10:15:00',
//       endsAt: '2024-09-10T11:15:00',
//       speakers: ['2'],
//       categoryItems: [102, 202],
//       roomId: 2
//     },
//     {
//       id: '3',
//       title: 'Microservices Architecture',
//       description: 'Designing scalable and maintainable systems using microservices.',
//       startsAt: '2024-09-10T11:30:00',
//       endsAt: '2024-09-10T12:30:00',
//       speakers: ['3', '4'],
//       categoryItems: [103, 203],
//       roomId: 3
//     },
//     {
//       id: '4',
//       title: 'DevOps Best Practices',
//       description: 'Learn about the latest tools and practices in DevOps.',
//       startsAt: '2024-09-10T13:30:00',
//       endsAt: '2024-09-10T14:30:00',
//       speakers: ['5'],
//       categoryItems: [104, 204],
//       roomId: 4
//     },
//     {
//       id: '5',
//       title: 'Building RESTful APIs with Node.js',
//       description: 'A practical guide to building and deploying RESTful APIs.',
//       startsAt: '2024-09-10T14:45:00',
//       endsAt: '2024-09-10T15:45:00',
//       speakers: ['6'],
//       categoryItems: [105, 205],
//       roomId: 1
//     },
//     {
//       id: '6',
//       title: 'GraphQL in Production',
//       description: 'Implementing and scaling GraphQL in production environments.',
//       startsAt: '2024-09-10T16:00:00',
//       endsAt: '2024-09-10T17:00:00',
//       speakers: ['7'],
//       categoryItems: [106, 206],
//       roomId: 2
//     },
//     {
//       id: '7',
//       title: 'Testing Strategies for Web Applications',
//       description: 'Comprehensive strategies for testing modern web applications.',
//       startsAt: '2024-09-11T09:00:00',
//       endsAt: '2024-09-11T10:00:00',
//       speakers: ['8'],
//       categoryItems: [107, 207],
//       roomId: 3
//     },
//     {
//       id: '8',
//       title: 'React.js for Beginners',
//       description: 'An introduction to building user interfaces with React.js.',
//       startsAt: '2024-09-11T10:15:00',
//       endsAt: '2024-09-11T11:15:00',
//       speakers: ['9'],
//       categoryItems: [108, 208],
//       roomId: 4
//     },
//     {
//       id: '9',
//       title: 'Vue.js in Depth',
//       description: 'Advanced techniques and best practices for Vue.js development.',
//       startsAt: '2024-09-11T11:30:00',
//       endsAt: '2024-09-11T12:30:00',
//       speakers: ['10'],
//       categoryItems: [109, 209],
//       roomId: 1
//     },
//     {
//       id: '10',
//       title: 'Continuous Integration with Jenkins',
//       description: 'Automating the build and deployment process with Jenkins.',
//       startsAt: '2024-09-11T13:30:00',
//       endsAt: '2024-09-11T14:30:00',
//       speakers: ['11'],
//       categoryItems: [110, 210],
//       roomId: 2
//     },
//     {
//       id: '11',
//       title: 'Serverless Architectures with AWS',
//       description: 'Building and managing serverless applications using AWS.',
//       startsAt: '2024-09-11T14:45:00',
//       endsAt: '2024-09-11T15:45:00',
//       speakers: ['12'],
//       categoryItems: [111, 211],
//       roomId: 3
//     },
//     {
//       id: '12',
//       title: 'Kubernetes for Developers',
//       description: 'An introduction to deploying and managing applications with Kubernetes.',
//       startsAt: '2024-09-11T16:00:00',
//       endsAt: '2024-09-11T17:00:00',
//       speakers: ['13'],
//       categoryItems: [112, 212],
//       roomId: 4
//     },
//     {
//       id: '13',
//       title: 'Building Mobile Apps with Flutter',
//       description: 'Developing cross-platform mobile apps using Flutter.',
//       startsAt: '2024-09-12T09:00:00',
//       endsAt: '2024-09-12T10:00:00',
//       speakers: ['14'],
//       categoryItems: [113, 213],
//       roomId: 1
//     },
//     {
//       id: '14',
//       title: 'Intro to Machine Learning with Python',
//       description: 'Getting started with machine learning using Python.',
//       startsAt: '2024-09-12T10:15:00',
//       endsAt: '2024-09-12T11:15:00',
//       speakers: ['15'],
//       categoryItems: [114, 214],
//       roomId: 2
//     },
//     {
//       id: '15',
//       title: 'Building Secure Web Applications',
//       description: 'Best practices for developing secure web applications.',
//       startsAt: '2024-09-12T11:30:00',
//       endsAt: '2024-09-12T12:30:00',
//       speakers: ['16'],
//       categoryItems: [115, 215],
//       roomId: 3
//     },
//     {
//       id: '16',
//       title: 'Agile Development: Beyond the Basics',
//       description: 'Advanced concepts and practices in Agile development.',
//       startsAt: '2024-09-12T13:30:00',
//       endsAt: '2024-09-12T14:30:00',
//       speakers: ['17'],
//       categoryItems: [116, 216],
//       roomId: 4
//     },
//     {
//       id: '17',
//       title: 'Docker for Developers',
//       description: 'Containerizing applications and environments with Docker.',
//       startsAt: '2024-09-12T14:45:00',
//       endsAt: '2024-09-12T15:45:00',
//       speakers: ['18'],
//       categoryItems: [117, 217],
//       roomId: 1
//     },
//     {
//       id: '18',
//       title: 'State Management in React',
//       description: 'An in-depth look at managing state in React applications.',
//       startsAt: '2024-09-12T16:00:00',
//       endsAt: '2024-09-12T17:00:00',
//       speakers: ['19'],
//       categoryItems: [118, 218],
//       roomId: 2
//     },
//     {
//       id: '19',
//       title: 'AI and the Future of Web Development',
//       description: 'Exploring the impact of AI on the future of web development.',
//       startsAt: '2024-09-13T09:00:00',
//       endsAt: '2024-09-13T10:00:00',
//       speakers: ['20'],
//       categoryItems: [119, 219],
//       roomId: 3
//     },
//     {
//       id: '20',
//       title: 'Full-Stack Development with MERN',
//       description: 'Building full-stack applications with MongoDB, Express, React, and Node.js.',
//       startsAt: '2024-09-13T10:15:00',
//       endsAt: '2024-09-13T11:15:00',
//       speakers: ['21'],
//       categoryItems: [120, 220],
//       roomId: 4
//     }
//   ],

//   speakers: [
//     {
//       id: '1',
//       firstName: 'Alice',
//       lastName: 'Johnson',
//       bio: 'Alice is a senior frontend developer with over 10 years of experience in building scalable web applications.',
//       tagLine: 'Senior Frontend Developer at TechCorp',
//       profilePicture: 'https://example.com/images/alice.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/alicejohnson',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'TechCorp',
//           url: 'https://techcorp.com',
//           linkType: 'Company_Website'
//         }
//       ],
//       sessions: [1],
//       fullName: 'Alice Johnson'
//     },
//     {
//       id: '2',
//       firstName: 'Bob',
//       lastName: 'Smith',
//       bio: 'Bob is a software architect specializing in JavaScript and cloud-native applications.',
//       tagLine: 'Software Architect at CloudNatives',
//       profilePicture: 'https://example.com/images/bob.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/bobsmith',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Personal Blog',
//           url: 'https://bobsmith.dev',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [2],
//       fullName: 'Bob Smith'
//     },
//     {
//       id: '3',
//       firstName: 'Carol',
//       lastName: 'White',
//       bio: 'Carol is an expert in microservices architecture and has been building distributed systems for over 15 years.',
//       tagLine: 'Chief Architect at MicroTech',
//       profilePicture: 'https://example.com/images/carol.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/carolwhite',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [3],
//       fullName: 'Carol White'
//     },
//     {
//       id: '4',
//       firstName: 'David',
//       lastName: 'Brown',
//       bio: 'David specializes in scalable backend systems and is passionate about open-source software.',
//       tagLine: 'Lead Backend Engineer at OpenSource Inc.',
//       profilePicture: 'https://example.com/images/david.jpg',
//       links: [
//         {
//           title: 'GitHub',
//           url: 'https://github.com/davidbrown',
//           linkType: 'Other'
//         }
//       ],
//       sessions: [3],
//       fullName: 'David Brown'
//     },
//     {
//       id: '5',
//       firstName: 'Eve',
//       lastName: 'Martinez',
//       bio: 'Eve is a DevOps engineer with extensive experience in automation and continuous integration.',
//       tagLine: 'DevOps Engineer at AutoDeploy',
//       profilePicture: 'https://example.com/images/eve.jpg',
//       links: [
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/evemartinez',
//           linkType: 'Twitter'
//         }
//       ],
//       sessions: [4],
//       fullName: 'Eve Martinez'
//     },
//     {
//       id: '6',
//       firstName: 'Frank',
//       lastName: 'Wilson',
//       bio: 'Frank is a full-stack developer with a focus on building RESTful APIs and microservices.',
//       tagLine: 'Full-Stack Developer at CodeWorks',
//       profilePicture: 'https://example.com/images/frank.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/frankwilson',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [5],
//       fullName: 'Frank Wilson'
//     },
//     {
//       id: '7',
//       firstName: 'Grace',
//       lastName: 'Lee',
//       bio: 'Grace is a senior engineer with a strong background in GraphQL and API development.',
//       tagLine: 'Senior Engineer at API World',
//       profilePicture: 'https://example.com/images/grace.jpg',
//       links: [
//         {
//           title: 'Personal Blog',
//           url: 'https://gracelee.dev',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [6],
//       fullName: 'Grace Lee'
//     },
//     {
//       id: '8',
//       firstName: 'Hank',
//       lastName: 'Moore',
//       bio: 'Hank is a QA engineer with a focus on automated testing and continuous integration.',
//       tagLine: 'QA Engineer at QualityFirst',
//       profilePicture: 'https://example.com/images/hank.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/hankmoore',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [7],
//       fullName: 'Hank Moore'
//     },
//     {
//       id: '9',
//       firstName: 'Ivy',
//       lastName: 'Scott',
//       bio: 'Ivy is a frontend developer and educator who specializes in React.js.',
//       tagLine: 'Frontend Developer and Educator',
//       profilePicture: 'https://example.com/images/ivy.jpg',
//       links: [
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/ivyscott',
//           linkType: 'Twitter'
//         },
//         {
//           title: 'Personal Blog',
//           url: 'https://ivyscott.dev',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [8],
//       fullName: 'Ivy Scott'
//     },
//     {
//       id: '10',
//       firstName: 'Jack',
//       lastName: 'Taylor',
//       bio: 'Jack is a full-stack developer with a deep understanding of Vue.js and its ecosystem.',
//       tagLine: 'Full-Stack Developer at VueMaster',
//       profilePicture: 'https://example.com/images/jack.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/jacktaylor',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [9],
//       fullName: 'Jack Taylor'
//     },
//     {
//       id: '11',
//       firstName: 'Kelly',
//       lastName: 'Green',
//       bio: 'Kelly is a CI/CD expert who loves optimizing the software delivery pipeline.',
//       tagLine: 'DevOps Specialist at Pipelines.io',
//       profilePicture: 'https://example.com/images/kelly.jpg',
//       links: [
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/kellygreen',
//           linkType: 'Twitter'
//         }
//       ],
//       sessions: [10],
//       fullName: 'Kelly Green'
//     },
//     {
//       id: '12',
//       firstName: 'Liam',
//       lastName: 'King',
//       bio: 'Liam is a cloud architect specializing in serverless architectures on AWS.',
//       tagLine: 'Cloud Architect at ServerlessOps',
//       profilePicture: 'https://example.com/images/liam.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/liamking',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [11],
//       fullName: 'Liam King'
//     },
//     {
//       id: '13',
//       firstName: 'Mia',
//       lastName: 'Reyes',
//       bio: 'Mia is a Kubernetes expert with years of experience in container orchestration.',
//       tagLine: 'Kubernetes Specialist at CloudContainers',
//       profilePicture: 'https://example.com/images/mia.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/miareyes',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Blog',
//           url: 'https://miareyes.com',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [12],
//       fullName: 'Mia Reyes'
//     },
//     {
//       id: '14',
//       firstName: 'Nina',
//       lastName: 'Torres',
//       bio: 'Nina is a mobile developer who loves building cross-platform apps using Flutter.',
//       tagLine: 'Mobile Developer at AppMakers',
//       profilePicture: 'https://example.com/images/nina.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/ninatorres',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/ninatorres',
//           linkType: 'Twitter'
//         }
//       ],
//       sessions: [13],
//       fullName: 'Nina Torres'
//     },
//     {
//       id: '15',
//       firstName: 'Oscar',
//       lastName: 'Rivera',
//       bio: 'Oscar is a data scientist and machine learning engineer with a passion for teaching.',
//       tagLine: 'Data Scientist at MLExperts',
//       profilePicture: 'https://example.com/images/oscar.jpg',
//       links: [
//         {
//           title: 'Personal Website',
//           url: 'https://oscar.ai',
//           linkType: 'Other'
//         }
//       ],
//       sessions: [14],
//       fullName: 'Oscar Rivera'
//     },
//     {
//       id: '16',
//       firstName: 'Paula',
//       lastName: 'Young',
//       bio: 'Paula is a cybersecurity expert focused on building secure and resilient systems.',
//       tagLine: 'Cybersecurity Specialist at SafeNet',
//       profilePicture: 'https://example.com/images/paula.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/paulayoung',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/paulayoung',
//           linkType: 'Twitter'
//         }
//       ],
//       sessions: [15],
//       fullName: 'Paula Young'
//     },
//     {
//       id: '17',
//       firstName: 'Quincy',
//       lastName: 'Hall',
//       bio: 'Quincy is an Agile coach helping teams achieve their full potential with Agile methodologies.',
//       tagLine: 'Agile Coach at AgilityWorks',
//       profilePicture: 'https://example.com/images/quincy.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/quincyhall',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [16],
//       fullName: 'Quincy Hall'
//     },
//     {
//       id: '18',
//       firstName: 'Riley',
//       lastName: 'Evans',
//       bio: 'Riley is a DevOps engineer who specializes in Docker and container orchestration.',
//       tagLine: 'DevOps Engineer at ContainerOps',
//       profilePicture: 'https://example.com/images/riley.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/rileyevans',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Personal Blog',
//           url: 'https://rileyevans.dev',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [17],
//       fullName: 'Riley Evans'
//     },
//     {
//       id: '19',
//       firstName: 'Sophie',
//       lastName: 'Turner',
//       bio: 'Sophie is a software engineer with a focus on state management in React applications.',
//       tagLine: 'Software Engineer at ReactMasters',
//       profilePicture: 'https://example.com/images/sophie.jpg',
//       links: [
//         {
//           title: 'Twitter',
//           url: 'https://twitter.com/sophieturner',
//           linkType: 'Twitter'
//         },
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/sophieturner',
//           linkType: 'LinkedIn'
//         }
//       ],
//       sessions: [18],
//       fullName: 'Sophie Turner'
//     },
//     {
//       id: '20',
//       firstName: 'Tom',
//       lastName: 'Brown',
//       bio: 'Tom is a visionary in AI and its applications in web development.',
//       tagLine: 'AI Engineer at WebAI',
//       profilePicture: 'https://example.com/images/tom.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/tombrown',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Personal Website',
//           url: 'https://tombrownai.com',
//           linkType: 'Other'
//         }
//       ],
//       sessions: [19],
//       fullName: 'Tom Brown'
//     },
//     {
//       id: '21',
//       firstName: 'Uma',
//       lastName: 'Patel',
//       bio: 'Uma is a full-stack developer with a passion for the MERN stack.',
//       tagLine: 'Full-Stack Developer at MERNWorks',
//       profilePicture: 'https://example.com/images/uma.jpg',
//       links: [
//         {
//           title: 'LinkedIn',
//           url: 'https://www.linkedin.com/in/umapatel',
//           linkType: 'LinkedIn'
//         },
//         {
//           title: 'Personal Blog',
//           url: 'https://umapatel.dev',
//           linkType: 'Blog'
//         }
//       ],
//       sessions: [20],
//       fullName: 'Uma Patel'
//     }
//   ],
//   categories: [],
//   rooms: []
// };
