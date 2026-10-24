/** Used to preview templates before a user has entered anything. */
export const SAMPLE_DATA = {
  personal: {
    fullName: 'Alex Morgan',
    headline: 'Product-minded Software Engineer',
    email: 'alex.morgan@mail.com',
    phone: '+880 1700-123456',
    location: 'Dhaka, Bangladesh',
    website: 'alexmorgan.dev',
    linkedin: 'linkedin.com/in/alexmorgan',
    github: 'github.com/alexm',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    summary: 'Engineer with 6 years of experience shipping reliable web platforms. Turned a legacy checkout into a modern React + Node.js system that lifted conversion by 18%. I care about clean architecture, mentoring and measurable outcomes.',
  },
  experience: [
    { company: 'Northwind Labs', role: 'Senior Software Engineer', location: 'Remote', startDate: '2022-02', endDate: '', current: true, description: '• Led a 5-person squad rebuilding checkout in React and Node.js (+18% conversion)\n• Introduced contract testing that cut production incidents by 42%\n• Mentored 4 engineers to promotion' },
    { company: 'Brightline Studio', role: 'Software Engineer', location: 'Dhaka', startDate: '2019-01', endDate: '2022-01', current: false, description: '• Built 20+ REST and GraphQL endpoints serving 2M requests/day\n• Automated deployments with GitHub Actions, saving 6 hours/week' },
  ],
  education: [{ school: 'University of Dhaka', degree: 'B.Sc.', field: 'Computer Science', startDate: '2014-01', endDate: '2018-12', grade: 'CGPA 3.8' }],
  skills: [
    { name: 'React', level: 'Expert' },
    { name: 'Node.js', level: 'Expert' },
    { name: 'MongoDB', level: 'Advanced' },
    { name: 'GraphQL', level: 'Advanced' },
    { name: 'Docker', level: 'Intermediate' },
  ],
  languages: [
    { name: 'English', proficiency: 'Fluent' },
    { name: 'Bangla', proficiency: 'Native' },
  ],
  projects: [{ name: 'OpenQueue', link: 'github.com/alexm/openqueue', description: 'Lightweight job queue for Node.js with 1.2k stars.' }],
  certifications: [{ name: 'AWS Certified Developer', issuer: 'Amazon', date: '2023-06' }],
  publications: [],
  interests: ['Open source', 'Photography', 'Chess'],
};

export const EMPTY_DATA = {
  personal: { fullName: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '', summary: '' },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
  publications: [],
  interests: [],
};
