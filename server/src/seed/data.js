/* Demo content so the platform looks alive on first boot. Edit or delete everything from the admin dashboard. */

export const templates = [
  {
    name: "Aurora Classic",
    category: "resume",
    layout: "classic",
    description:
      "Timeless single-column layout trusted by recruiters and parsers alike.",
    theme: {
      primary: "#2F4BFF",
      accent: "#FF6A3D",
      font: "Manrope",
      headingFont: "Instrument Serif",
    },
    tags: ["ats-friendly", "corporate"],
    isFeatured: true,
    order: 1,
  },
  {
    name: "Meridian Sidebar",
    category: "resume",
    layout: "sidebar",
    description:
      "Two-column design with a tinted sidebar for skills and contact details.",
    theme: {
      primary: "#0F766E",
      accent: "#F59E0B",
      font: "Manrope",
      headingFont: "Manrope",
    },
    tags: ["modern", "tech"],
    isFeatured: true,
    order: 2,
  },
  {
    name: "Slate Minimal",
    category: "resume",
    layout: "minimal",
    description:
      "Whitespace-first and quietly confident. Perfect for senior engineers.",
    theme: {
      primary: "#15171C",
      accent: "#6366F1",
      font: "Inter",
      headingFont: "Inter",
    },
    tags: ["minimal", "ats-friendly"],
    order: 3,
  },
  {
    name: "Summit Executive",
    category: "resume",
    layout: "executive",
    description:
      "Bold header band and achievement-led structure for leadership roles.",
    theme: {
      primary: "#1E293B",
      accent: "#C2410C",
      font: "Manrope",
      headingFont: "Instrument Serif",
    },
    tags: ["leadership", "executive"],
    isFeatured: true,
    order: 4,
  },
  {
    name: "Prism Creative",
    category: "resume",
    layout: "creative",
    description:
      "Expressive colour blocking for designers, marketers and product people.",
    theme: {
      primary: "#7C3AED",
      accent: "#EC4899",
      font: "Manrope",
      headingFont: "Manrope",
    },
    tags: ["creative", "design"],
    order: 5,
  },
  {
    name: "Chronos Timeline",
    category: "resume",
    layout: "timeline",
    description:
      "Your career as a clear visual timeline — great for steady progression.",
    theme: {
      primary: "#0369A1",
      accent: "#10B981",
      font: "Manrope",
      headingFont: "Manrope",
    },
    tags: ["timeline", "modern"],
    order: 6,
  },
  {
    name: "Scholar CV",
    category: "cv",
    layout: "classic",
    description: "Academic CV with room for publications, grants and teaching.",
    theme: {
      primary: "#7F1D1D",
      accent: "#B45309",
      font: "Manrope",
      headingFont: "Instrument Serif",
    },
    tags: ["academic", "research"],
    isFeatured: true,
    order: 7,
  },
  {
    name: "Clinician CV",
    category: "cv",
    layout: "sidebar",
    description: "Structured CV for healthcare and licensed professionals.",
    theme: {
      primary: "#0E7490",
      accent: "#E11D48",
      font: "Manrope",
      headingFont: "Manrope",
    },
    tags: ["medical", "structured"],
    order: 8,
  },
  {
    name: "Engineer CV",
    category: "cv",
    layout: "timeline",
    description:
      "Detailed CV for engineering, MEP and technical consulting careers.",
    theme: {
      primary: "#334155",
      accent: "#EA580C",
      font: "Manrope",
      headingFont: "Manrope",
    },
    tags: ["engineering", "technical"],
    order: 9,
  },
];

export const demoUsers = [
  {
    username: "nadia.rahman",
    name: "Nadia Rahman",
    email: "nadia@demo.hireloom.dev",
    headline: "Senior Frontend Engineer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nadia",
    location: { country: "Bangladesh", city: "Dhaka" },
    skills: ["React", "TypeScript", "GSAP"],
  },
  {
    username: "arif.hossain",
    name: "Arif Hossain",
    email: "arif@demo.hireloom.dev",
    headline: "Cloud & DevOps Engineer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=arif",
    location: { country: "Bangladesh", city: "Chattogram" },
    skills: ["AWS", "Kubernetes", "Terraform"],
  },
  {
    username: "sara.khan",
    name: "Sara Khan",
    email: "sara@demo.hireloom.dev",
    headline: "Data Scientist",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara",
    location: { country: "United Arab Emirates", city: "Dubai" },
    skills: ["Python", "TensorFlow", "SQL"],
  },
  {
    username: "tanvir.ahmed",
    name: "Tanvir Ahmed",
    email: "tanvir@demo.hireloom.dev",
    headline: "Security Analyst",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tanvir",
    location: { country: "Malaysia", city: "Kuala Lumpur" },
    skills: ["Pentesting", "SIEM", "Linux"],
  },
];

export const sampleResumes = [
  {
    title: "Senior Frontend Engineer",
    kind: "resume",
    template: "aurora-classic",
    data: {
      personal: {
        fullName: "Nadia Rahman",
        headline: "Senior Frontend Engineer",
        email: "nadia.rahman@mail.com",
        phone: "+880 1711-223344",
        location: "Dhaka, Bangladesh",
        website: "nadia.dev",
        linkedin: "linkedin.com/in/nadiarahman",
        github: "github.com/nadiar",
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=nadia-resume",
        summary:
          "Frontend engineer with 7 years of experience building accessible, high-performance React applications used by 2M+ people. I pair product thinking with deep craft in design systems, animation and web performance.",
      },
      experience: [
        {
          company: "Pathao",
          role: "Senior Frontend Engineer",
          location: "Dhaka",
          startDate: "2021-03",
          endDate: "",
          current: true,
          description:
            "• Led the rebuild of the rider web app in React 18 + TypeScript, cutting bundle size by 41%\n• Built a design system of 60+ components adopted by 5 product teams\n• Mentored 6 engineers; introduced visual regression testing that reduced UI bugs by 35%",
        },
        {
          company: "Brain Station 23",
          role: "Frontend Engineer",
          location: "Dhaka",
          startDate: "2018-01",
          endDate: "2021-02",
          current: false,
          description:
            "• Delivered 12 client SPAs for banking and telco customers\n• Improved Lighthouse performance scores from 54 to 96 on the flagship portal",
        },
      ],
      education: [
        {
          school: "BUET",
          degree: "B.Sc.",
          field: "Computer Science & Engineering",
          startDate: "2013-01",
          endDate: "2017-12",
          grade: "CGPA 3.72",
        },
      ],
      skills: [
        { name: "React", level: "Expert" },
        { name: "TypeScript", level: "Expert" },
        { name: "Next.js", level: "Advanced" },
        { name: "GSAP", level: "Advanced" },
        { name: "GraphQL", level: "Advanced" },
        { name: "Accessibility", level: "Advanced" },
      ],
      languages: [
        { name: "Bangla", proficiency: "Native" },
        { name: "English", proficiency: "Fluent" },
      ],
      projects: [
        {
          name: "Motionkit",
          link: "github.com/nadiar/motionkit",
          description:
            "Open-source React animation primitives with 2.4k GitHub stars.",
        },
      ],
      certifications: [
        {
          name: "AWS Certified Cloud Practitioner",
          issuer: "Amazon",
          date: "2023-05",
        },
      ],
      interests: ["Typography", "Open source", "Cycling"],
    },
  },
  {
    title: "Cloud & DevOps Engineer",
    kind: "resume",
    template: "meridian-sidebar",
    data: {
      personal: {
        fullName: "Arif Hossain",
        headline: "Cloud & DevOps Engineer",
        email: "arif.hossain@mail.com",
        phone: "+880 1819-556677",
        location: "Chattogram, Bangladesh",
        linkedin: "linkedin.com/in/arifh",
        github: "github.com/arifops",
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=arif-resume",
        summary:
          "DevOps engineer who automates everything twice. 5 years running Kubernetes platforms on AWS with 99.98% uptime and a culture of blameless post-mortems.",
      },
      experience: [
        {
          company: "bKash",
          role: "DevOps Engineer",
          location: "Dhaka",
          startDate: "2020-06",
          endDate: "",
          current: true,
          description:
            "• Migrated 40 services to EKS with GitOps (Argo CD), reducing deploy time from 45 to 6 minutes\n• Cut AWS spend 28% through rightsizing and spot instances\n• Built observability stack (Prometheus, Grafana, Loki) covering 300+ alerts",
        },
        {
          company: "Grameenphone",
          role: "Systems Engineer",
          location: "Dhaka",
          startDate: "2018-07",
          endDate: "2020-05",
          current: false,
          description:
            "• Automated Linux patching for 900 servers with Ansible\n• Wrote runbooks that reduced MTTR by 40%",
        },
      ],
      education: [
        {
          school: "CUET",
          degree: "B.Sc.",
          field: "Electrical & Electronic Engineering",
          startDate: "2014-01",
          endDate: "2018-03",
          grade: "",
        },
      ],
      skills: [
        { name: "AWS", level: "Expert" },
        { name: "Kubernetes", level: "Expert" },
        { name: "Terraform", level: "Advanced" },
        { name: "Docker", level: "Expert" },
        { name: "CI/CD", level: "Advanced" },
        { name: "Python", level: "Intermediate" },
      ],
      languages: [
        { name: "Bangla", proficiency: "Native" },
        { name: "English", proficiency: "Professional" },
      ],
      projects: [
        {
          name: "tf-guardrails",
          link: "",
          description:
            "Policy-as-code checks for Terraform plans used across 3 teams.",
        },
      ],
      certifications: [
        {
          name: "Certified Kubernetes Administrator",
          issuer: "CNCF",
          date: "2022-09",
        },
        {
          name: "AWS Solutions Architect – Associate",
          issuer: "Amazon",
          date: "2021-11",
        },
      ],
      interests: ["Homelabs", "Chess"],
    },
  },
  {
    title: "Data Scientist",
    kind: "resume",
    template: "prism-creative",
    data: {
      personal: {
        fullName: "Sara Khan",
        headline: "Data Scientist · ML Engineer",
        email: "sara.khan@mail.com",
        phone: "+971 50 123 4567",
        location: "Dubai, UAE",
        website: "sarakhan.ai",
        linkedin: "linkedin.com/in/sarakhan",
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara-resume",
        summary:
          "Data scientist turning messy data into decisions. Shipped forecasting and NLP models that saved $3.1M annually across retail and logistics.",
      },
      experience: [
        {
          company: "Careem",
          role: "Data Scientist",
          location: "Dubai",
          startDate: "2022-02",
          endDate: "",
          current: true,
          description:
            "• Built demand-forecasting models (LightGBM) improving supply allocation accuracy by 18%\n• Productionised an Arabic/English intent classifier serving 4M requests/month\n• Partnered with product to design 25+ A/B experiments",
        },
        {
          company: "Noon",
          role: "Data Analyst",
          location: "Dubai",
          startDate: "2019-09",
          endDate: "2022-01",
          current: false,
          description:
            "• Automated weekly reporting in Python, saving 15 analyst-hours per week\n• Built Power BI dashboards used by 120 managers",
        },
      ],
      education: [
        {
          school: "University of Dhaka",
          degree: "M.Sc.",
          field: "Applied Statistics",
          startDate: "2017-01",
          endDate: "2019-06",
          grade: "First class",
        },
      ],
      skills: [
        { name: "Python", level: "Expert" },
        { name: "TensorFlow", level: "Advanced" },
        { name: "SQL", level: "Expert" },
        { name: "NLP", level: "Advanced" },
        { name: "Power BI", level: "Advanced" },
      ],
      languages: [
        { name: "English", proficiency: "Fluent" },
        { name: "Arabic", proficiency: "Conversational" },
        { name: "Bangla", proficiency: "Native" },
      ],
      projects: [
        {
          name: "Retail Pulse",
          link: "",
          description:
            "Real-time sales anomaly detection using streaming features.",
        },
      ],
      certifications: [
        {
          name: "TensorFlow Developer Certificate",
          issuer: "Google",
          date: "2022-03",
        },
      ],
      interests: ["Kaggle", "Calligraphy"],
    },
  },
  {
    title: "Fire Safety & MEP Engineer CV",
    kind: "cv",
    template: "engineer-cv",
    data: {
      personal: {
        fullName: "Rafiq Chowdhury",
        headline: "Fire Safety & MEP Engineer",
        email: "rafiq.c@mail.com",
        phone: "+880 1555-889900",
        location: "Dhaka, Bangladesh",
        linkedin: "linkedin.com/in/rafiqc",
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=rafiq-resume",
        summary:
          "Chartered engineer with 12 years in fire protection, HVAC and MEP compliance for industrial facilities. Delivered 30+ projects to NFPA, BNBC and RSC standards with zero major audit findings.",
      },
      experience: [
        {
          company: "Industrial Compliance Ltd.",
          role: "Lead Fire Safety Engineer",
          location: "Dhaka",
          startDate: "2017-04",
          endDate: "",
          current: true,
          description:
            "• Designed sprinkler, hydrant and fire-alarm systems for 24 RMG factories per NFPA 13/14/72\n• Managed EPC packages up to BDT 18 crore with on-time handover\n• Trained 150+ technicians in inspection, testing & maintenance (NFPA 25)",
        },
        {
          company: "MEP Consultants BD",
          role: "MEP Design Engineer",
          location: "Dhaka",
          startDate: "2013-01",
          endDate: "2017-03",
          current: false,
          description:
            "• Produced HVAC load calculations and duct designs for commercial towers\n• Coordinated BIM clash detection reducing site rework by 22%",
        },
      ],
      education: [
        {
          school: "BUET",
          degree: "B.Sc.",
          field: "Mechanical Engineering",
          startDate: "2008-01",
          endDate: "2012-12",
          grade: "",
        },
      ],
      skills: [
        { name: "NFPA 13/14/20/72", level: "Expert" },
        { name: "HVAC Design", level: "Advanced" },
        { name: "AutoCAD & Revit", level: "Advanced" },
        { name: "Fire Risk Assessment", level: "Expert" },
        { name: "Project Management", level: "Advanced" },
      ],
      languages: [
        { name: "Bangla", proficiency: "Native" },
        { name: "English", proficiency: "Professional" },
      ],
      projects: [
        {
          name: "Hydraulic Calc Toolkit",
          link: "",
          description:
            "Excel/VBA toolkit for sprinkler hydraulic calculations adopted firm-wide.",
        },
      ],
      certifications: [
        {
          name: "Certified Fire Protection Specialist (CFPS)",
          issuer: "NFPA",
          date: "2019-08",
        },
        { name: "PMP", issuer: "PMI", date: "2021-02" },
      ],
      publications: [
        {
          title: "Performance-based fire design for RMG factories",
          venue: "Bangladesh Engineering Journal",
          year: "2020",
        },
      ],
      interests: ["Mentoring", "Industrial safety advocacy"],
    },
  },
];

const md = (s) => s.trim().replace(/^ {2}/gm, "");

export const blogs = [
  {
    title: "The 2026 Résumé: What Recruiters Actually Read in 7 Seconds",
    category: "Career",
    tags: ["resume", "career", "ats"],
    author: "admin",
    featured: true,
    img: "resume-desk",
    youtubeUrl: "",
    content: md(`
  Eye-tracking studies keep confirming the same thing: a recruiter's first pass on your résumé is **shorter than a TikTok**. In those seconds they scan four things — your current title, your last company, your dates, and whether your skills match the role.

  ## Lead with the headline, not an objective
  Replace "Seeking a challenging position…" with a crisp headline: **Senior Backend Engineer · Node.js · Payments**. It frames everything below it.

  ## Bullets are for outcomes
  Every bullet should answer *"so what?"*. Compare:

  - ❌ Responsible for the API layer
  - ✅ Rebuilt the payments API in Node.js, cutting p95 latency from 820ms to 190ms

  ## Make the parser's life easy
  Applicant tracking systems still struggle with tables, columns of icons and text inside images. Use standard headings — *Experience, Education, Skills* — and save as a text-based PDF.

  ## The one-page question
  Under ten years of experience? One page. Beyond that, two pages are fine **if page two earns its place**.

  > Your résumé isn't your biography. It's an advertisement for your next role.

  Try running your current résumé through the HireLoom ATS checker with a real job description — the missing-keyword list is usually eye-opening.`),
  },
  {
    title:
      "React 19 in Production: Actions, the Compiler and What Changed for Us",
    category: "Web Development",
    tags: ["react", "javascript", "frontend"],
    author: "nadia.rahman",
    featured: true,
    img: "react-code",
    youtubeUrl: "https://www.youtube.com/watch?v=Tn6-PIqc4UM",
    content: md(`
  We migrated a 120k-line React codebase to React 19 over six weeks. Here is what actually mattered.

  ## Actions simplified our forms
  Form submissions that used to need \`useState\` for pending, error and success now collapse into a single action with \`useActionState\`. We deleted roughly **1,900 lines** of boilerplate.

  ## The compiler is not magic — but it is close
  After enabling the React Compiler we removed most manual \`useMemo\` and \`useCallback\` calls. Interaction latency on our heaviest screen improved by **23%** with no code changes beyond the removals.

  ## Things that bit us
  1. Third-party libraries that mutate props broke compiler assumptions.
  2. A few effects relied on render timing that changed with the new scheduler.
  3. Our test utilities needed updating for the new \`act\` behaviour.

  ## Should you upgrade?
  If your team ships forms-heavy UIs, yes. Start with a single route behind a flag, measure, then roll out.

  The short video above is still the fastest refresher on React fundamentals if you are onboarding juniors during the migration.`),
  },
  {
    title: "Kubernetes Cost Optimisation: How We Cut Our Cloud Bill by 28%",
    category: "Cloud & DevOps",
    tags: ["kubernetes", "aws", "finops"],
    author: "arif.hossain",
    img: "server-room",
    youtubeUrl: "",
    content: md(`
  Cloud bills grow quietly. Ours grew 60% in a year while traffic grew 20%. Here is the playbook that brought it back under control.

  ## 1. Measure per team, per namespace
  We installed Kubecost and tagged every namespace with an owner. Visibility alone changed behaviour — two teams voluntarily shut down forgotten staging clusters.

  ## 2. Rightsize requests, not limits
  Most pods requested **3–4× the CPU they used**. We used VPA in recommendation mode for two weeks, then applied the suggestions.

  ## 3. Spot instances for stateless workloads
  With Karpenter and a mixed instance policy, 65% of our stateless workloads now run on spot capacity with graceful interruption handling.

  ## 4. Autoscale on the right signal
  CPU is a poor proxy for queue-based services. Switching to KEDA with queue depth reduced idle replicas overnight.

  ## Results
  | Change | Monthly saving |
  |---|---|
  | Rightsizing | 11% |
  | Spot instances | 12% |
  | Idle cleanup | 5% |

  FinOps is a habit, not a project. Review the dashboard every sprint.`),
  },
  {
    title: "A Gentle Introduction to Neural Networks for Web Developers",
    category: "AI & ML",
    tags: ["machine learning", "tensorflow", "ai"],
    author: "sara.khan",
    featured: true,
    img: "neural-art",
    youtubeUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    content: md(`
  You don't need a PhD to understand neural networks — you need a good mental model.

  ## Neurons are just weighted sums
  Each neuron multiplies its inputs by weights, adds a bias and passes the result through an activation function. Stack thousands of them in layers and you get a function that can approximate almost anything.

  ## Training = nudging weights
  Training compares the network's output to the correct answer, measures the error (the *loss*) and nudges every weight slightly in the direction that reduces it. That's **gradient descent**.

  ## Running models in the browser
  With TensorFlow.js and **TensorFlow Lite** you can run trained models directly on the client. No server round-trip, and the user's data never leaves the device. HireLoom's *AI Lab* uses a MobileNet TFLite model to classify images from your webcam in real time.

  ## Where to start
  1. Watch the 3Blue1Brown video embedded above.
  2. Train a tiny model on a toy dataset.
  3. Convert it to TFLite and load it in a web page.

  The best way to demystify ML is to ship something small with it.`),
  },
  {
    title: "Zero Trust for Small Teams: A Practical 30-Day Plan",
    category: "Cybersecurity",
    tags: ["security", "zero trust", "devsecops"],
    author: "tanvir.ahmed",
    img: "cyber-lock",
    youtubeUrl: "",
    content: md(`
  "Zero Trust" sounds like an enterprise budget line. It isn't. It's a mindset: **never trust a network location; always verify identity and device**.

  ## Week 1 — Identity
  - Enforce SSO and hardware-key or app-based MFA for every admin account.
  - Remove shared credentials. Rotate anything that lives in a spreadsheet.

  ## Week 2 — Devices
  - Require disk encryption and OS updates for laptops that access production.
  - Use a lightweight MDM; even a checklist beats nothing.

  ## Week 3 — Access
  - Replace the VPN for internal tools with an identity-aware proxy.
  - Apply least privilege: default to read-only.

  ## Week 4 — Visibility
  - Centralise logs. Alert on impossible travel and new admin grants.
  - Run a tabletop exercise: *"A developer laptop is stolen — what happens next?"*

  Security is a product feature your customers never see until it fails.`),
  },
  {
    title: "GraphQL vs REST vs SOAP: Choosing the Right API Style in 2026",
    category: "Web Development",
    tags: ["graphql", "rest", "soap", "api"],
    author: "admin",
    img: "api-network",
    youtubeUrl: "",
    content: md(`
  HireLoom itself exposes all three API styles — here is when each one shines.

  ## REST
  Resource-oriented, cache-friendly and universally understood. Ideal for public APIs and CRUD-heavy apps. Our résumé, blog and comment endpoints are REST.

  ## GraphQL
  Clients ask for exactly the fields they need in a single round-trip. Perfect for dashboards and mobile apps with varied data needs. Our landing page's *trending posts* and *site stats* come from GraphQL.

  ## SOAP
  Verbose, strictly typed through WSDL, and still everywhere in banking, telecom and government integrations. HireLoom offers a SOAP \`GetAtsScore\` operation so enterprise HR systems can integrate without custom code.

  ## Decision checklist
  - Many different clients needing different shapes → **GraphQL**
  - Public, cacheable, simple resources → **REST**
  - Enterprise contracts, strict schemas, WS-Security → **SOAP**

  Try them yourself on the **Developers** page.`),
  },
  {
    title: "From Junior to Mid-Level Developer: The Skills Nobody Lists",
    category: "Career",
    tags: ["career", "growth", "soft skills"],
    author: "nadia.rahman",
    img: "team-meeting",
    youtubeUrl: "https://www.youtube.com/watch?v=zOjov-2OZ0E",
    content: md(`
  Promotions rarely hinge on a new framework. They hinge on **trust** — can the team hand you an ambiguous problem and stop worrying?

  ## Write things down
  Short design notes before coding. A two-paragraph doc saves two days of rework.

  ## Own the whole loop
  Don't stop at "merged". Watch the dashboard after release, read the support tickets, and follow up.

  ## Ask better questions
  Instead of *"It doesn't work"*, try *"I expected X, observed Y, I've ruled out A and B — could it be C?"*

  ## Review code generously
  Thoughtful reviews are the fastest way to learn a codebase and to become visible.

  ## Estimate, then compare
  Track your estimates versus reality for a month. Calibration is a superpower.

  None of these appear on job descriptions, yet they're exactly what managers discuss in promotion meetings.`),
  },
  {
    title: "SQL Window Functions Every Analyst Should Know",
    category: "Data Science",
    tags: ["sql", "analytics", "data"],
    author: "sara.khan",
    img: "data-charts",
    youtubeUrl: "",
    content: md(`
  Window functions let you compute across rows **without collapsing them** like \`GROUP BY\` does.

  ## Running totals
  \`\`\`sql
  SELECT order_date, amount,
         SUM(amount) OVER (ORDER BY order_date) AS running_total
  FROM orders;
  \`\`\`

  ## Rank within groups
  \`\`\`sql
  SELECT region, rep, revenue,
         RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
  FROM sales;
  \`\`\`

  ## Compare with the previous row
  \`LAG()\` and \`LEAD()\` make month-over-month growth a one-liner.

  ## Moving averages
  \`AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)\` gives a clean 7-day trend.

  Master these four patterns and half of your "this needs Python" problems disappear.`),
  },
  {
    title: "Designing Accessible Animations with GSAP",
    category: "Web Development",
    tags: ["gsap", "animation", "accessibility"],
    author: "nadia.rahman",
    img: "motion-design",
    youtubeUrl: "",
    content: md(`
  Motion guides attention, explains change and adds delight — but it can also cause nausea for people with vestibular disorders.

  ## Respect reduced motion
  \`\`\`js
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.card', { y: 40, opacity: 0, stagger: 0.08 });
  });
  \`\`\`

  ## Animate transform and opacity only
  They're composited on the GPU and won't trigger layout thrashing.

  ## Keep durations purposeful
  UI feedback: 150–250ms. Page transitions: 300–500ms. Anything longer should be decorative and skippable.

  ## ScrollTrigger with restraint
  Pin sparingly. Scroll-jacking frustrates keyboard and trackpad users alike.

  The best animation is the one users feel but don't consciously notice.`),
  },
  {
    title: "Remote Interviews: A Checklist That Actually Helps",
    category: "Productivity",
    tags: ["interview", "remote", "career"],
    author: "arif.hossain",
    img: "laptop-call",
    youtubeUrl: "",
    content: md(`
  Remote interviews remove the commute but add new failure modes. Run this checklist the day before.

  - **Audio first.** A cheap wired headset beats laptop speakers every time.
  - **Light your face** from the front; avoid a bright window behind you.
  - **Close notifications**, Slack and email. Share a single window, not your whole screen.
  - **Prepare a scratch file** for live-coding with your language's boilerplate ready.
  - **Have a backup**: phone hotspot and the interviewer's email to send a quick note if the call drops.
  - **Prepare 3 questions** about how the team works — they reveal more than any perk list.

  Then breathe. Interviewers want you to succeed; you're solving a problem together.`),
  },
];

export const pendingBlogs = [
  {
    title: "Why Every Developer Should Learn Basic Networking",
    category: "Technology",
    tags: ["networking", "fundamentals"],
    author: "tanvir.ahmed",
    img: "network-cables",
    content: md(`
  DNS, TCP handshakes, TLS and HTTP caching explain a surprising number of "random" production bugs. This post walks through the five networking concepts that saved me the most debugging hours, with real incident stories from the past year.`),
  },
  {
    title: "Building a Personal Brand on LinkedIn Without Feeling Fake",
    category: "Career",
    tags: ["linkedin", "branding"],
    author: "sara.khan",
    img: "workspace",
    content: md(`
  Personal branding doesn't require hustle-culture posts. Share what you learned this week, document small wins and credit your teammates. Consistency beats virality; here's a sustainable cadence that takes 30 minutes a week.`),
  },
];

export const comments = [
  "This is exactly what I needed before my interview next week. Thank you!",
  "Great breakdown — bookmarking this for my team.",
  "Could you write a follow-up with more real-world examples?",
  "The before/after examples made it click for me.",
  "Shared this with our bootcamp cohort 🙌",
  "Clear, practical and no fluff. More of this please.",
];

export const siteReviews = [
  {
    user: "nadia.rahman",
    value: 5,
    review:
      "The ATS checker showed me exactly which keywords I was missing. Two interviews in a week.",
  },
  {
    user: "arif.hossain",
    value: 5,
    review:
      "Clean templates, real-time preview and the cover-letter studio is genuinely useful.",
  },
  {
    user: "sara.khan",
    value: 4,
    review:
      "Love the community journal — finally a tech blog that isn’t just SEO spam.",
  },
  {
    user: "tanvir.ahmed",
    value: 5,
    review: "Built my CV in 20 minutes and the PDF export looks pixel-perfect.",
  },
];
