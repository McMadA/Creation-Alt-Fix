document.addEventListener('DOMContentLoaded', function() {
    // --- SUBPAGE TRANSLATIONS ---
    const translations = {
        'nl': {
            // Nav
            "navHome": "Home",
            "navAIServices": "AI Services",
            "navWebDesign": "Web Design & Tech",
            "navProjects": "Projecten",
            "navContact": "Contact",

            // Diensten Overview
            "dienstenOverviewTitle": "Onze <span>Diensten</span>",
            "dienstenOverviewSubtitle": "Van IT-support en AI-automatisering tot websites en data dashboards. Wij bieden een compleet pakket aan digitale oplossingen voor ondernemers en particulieren in Groningen en omgeving.",
            "dienstenOverviewH1": "Onze Diensten - IT, AI, Websites & Dashboards in <span>Groningen</span>",

            "overzichtITTitle": "IT Support & Beheer",
            "overzichtITP": "PC-reparatie, netwerkbeheer en betrouwbare IT-ondersteuning voor particulieren en bedrijven.",
            "overzichtITBtn": "Meer over IT Support",
            "overzichtAITitle": "Slimme Automatisering & AI",
            "overzichtAIP": "Workflow automatisering, AI-consultancy en slimme bedrijfstools die uw werk makkelijker maken.",
            "overzichtAIBtn": "Meer over AI & Automatisering",
            "overzichtWebTitle": "Website Laten Maken",
            "overzichtWebP": "Moderne, snelle websites en webshops vanaf \u20ac99. Responsive design, gebouwd voor resultaat.",
            "overzichtWebBtn": "Meer over Websites",
            "overzichtDashTitle": "Data Dashboards & Inzichten",
            "overzichtDashP": "Overzichtelijke dashboards en KPI-rapportages die uw bedrijfsdata tot leven brengen.",
            "overzichtDashBtn": "Meer over Dashboards",

            // IT Support Page
            "itH1": "IT Support & Beheer in <span>Groningen</span>",
            "itLead": "Betrouwbare IT-ondersteuning voor particulieren en MKB. Van PC-reparatie tot compleet netwerkbeheer \u2013 wij zorgen dat uw technologie werkt.",
            "itH2Wat": "Wat wij doen",
            "itP1": "Of uw computer vastloopt, uw netwerk traag is, of u last heeft van malware \u2013 Creation+Alt+Fix staat voor u klaar. Met jarenlange ervaring in IT-support bieden wij snelle, persoonlijke hulp aan particulieren en bedrijven in Groningen en omgeving.",
            "itP2": "Wij geloven dat goede IT-support meer is dan alleen problemen oplossen. Het gaat om het voorkomen van problemen, het optimaliseren van uw systemen en het zorgen dat u zich kunt focussen op wat \u00e9cht belangrijk is.",
            "itH2Diensten": "Onze IT-diensten",
            "itCard1Title": "PC & Mac Reparatie",
            "itCard1P": "Hardware- en softwareproblemen? Wij diagnosticeren en repareren uw computer snel en vakkundig. Inclusief data recovery.",
            "itCard2Title": "Netwerkbeheer & WiFi",
            "itCard2P": "Stabiel internet nodig? Wij optimaliseren uw netwerk, configureren routers en zorgen voor betrouwbare WiFi-dekking.",
            "itCard3Title": "Virusverwijdering & Beveiliging",
            "itCard3P": "Malware, ransomware of phishing? Wij verwijderen bedreigingen en beveiligen uw systemen tegen toekomstige aanvallen.",
            "itCard4Title": "Software Installatie & Updates",
            "itCard4P": "Van Windows-installaties tot softwareconfiguratie. Wij zorgen dat uw programma\u2019s up-to-date en goed ingesteld zijn.",
            "itH2Waarom": "Waarom kiezen voor Creation+Alt+Fix?",
            "itP3": "Wij combineren traditionele IT-expertise met moderne tools en AI-ondersteuning. Dat betekent snellere diagnoses, effici\u00ebntere oplossingen en lagere kosten voor u. Bovendien spreken wij uw taal \u2013 geen technisch jargon, maar heldere uitleg.",
            "itP4": "Heeft u een IT-probleem dat u niet zelf kunt oplossen? Of zoekt u een betrouwbare partner voor doorlopend IT-beheer? Combineer dit met onze <a href=\"/diensten/slimme-automatisering-ai/\">AI-automatisering</a> voor nog slimmere oplossingen.",
            "itFaqTitle": "Veelgestelde vragen over IT Support",
            "itFaq1Q": "Hoe snel kunnen jullie mijn computer repareren?",
            "itFaq1A": "Veel voorkomende problemen lossen wij dezelfde dag nog op. Voor complexere reparaties, zoals hardwarevervanging of dataherstel, geven wij altijd vooraf een tijdsinschatting.",
            "itFaq2Q": "Komen jullie ook aan huis?",
            "itFaq2A": "Ja, wij bieden IT-support aan huis in Groningen en omgeving. Voor veel problemen kan ook remote support een snelle oplossing zijn.",
            "itFaq3Q": "Wat kost IT-support bij Creation+Alt+Fix?",
            "itFaq3A": "Wij werken met transparante tarieven en geven altijd vooraf een prijsindicatie. Neem contact op voor een vrijblijvende offerte.",
            "itFaq4Q": "Ondersteunen jullie ook Apple / Mac computers?",
            "itFaq4A": "Ja, wij bieden support voor zowel Windows als macOS systemen, inclusief software-installatie, updates en probleemoplossing.",
            "itRelatedTitle": "Gerelateerde diensten",

            // AI Page
            "aiH1": "AI Automatisering & Consultancy in <span>Groningen</span>",
            "aiLead": "Laat kunstmatige intelligentie voor u werken. Wij adviseren en implementeren AI-oplossingen die uw werkprocessen sneller, slimmer en goedkoper maken.",
            "aiH2Wat": "De kracht van AI voor uw bedrijf",
            "aiP1": "Artificial Intelligence is geen toekomstmuziek meer \u2013 het is een praktische tool die vandaag al resultaat oplevert. Bij Creation+Alt+Fix vertalen wij de mogelijkheden van AI naar concrete oplossingen voor uw bedrijf. Geen hype, maar hands-on implementatie die direct waarde toevoegt.",
            "aiP2": "Of u nu repetitieve taken wilt automatiseren, slimmere inzichten uit uw data wilt halen, of een chatbot wilt inzetten voor klantenservice \u2013 wij helpen u van idee tot werkende oplossing.",
            "aiH2Diensten": "Onze AI-diensten",
            "aiCard1Title": "Workflow Automatisering",
            "aiCard1P": "Automatiseer terugkerende taken zoals e-mailverwerking, documentgeneratie en dataverwerking. Bespaar uren per week.",
            "aiCard2Title": "AI Consultancy & Strategie",
            "aiCard2P": "Weet u niet waar te beginnen met AI? Wij analyseren uw processen en adviseren waar AI de meeste impact heeft.",
            "aiCard3Title": "Chatbots & Klantinteractie",
            "aiCard3P": "Intelligente chatbots die 24/7 vragen beantwoorden, afspraken inplannen en leads genereren voor uw bedrijf.",
            "aiCard4Title": "Slimme Bedrijfstools",
            "aiCard4P": "Van offertegeneratoren tot CRM-systemen \u2013 wij bouwen op maat gemaakte tools aangedreven door AI.",
            "aiH2Waarom": "Waarom AI met Creation+Alt+Fix?",
            "aiP3": "Wij maken AI toegankelijk en betaalbaar voor het MKB. U hoeft geen techneut te zijn \u2013 u vertelt ons uw wens in heldere taal en wij zorgen voor de technische realisatie. Door onze combinatie van <a href=\"/diensten/it-support-beheer/\">IT-expertise</a> en AI-kennis leveren wij oplossingen die naadloos integreren in uw bestaande werkwijze.",
            "aiP4": "Combineer AI-automatisering met een <a href=\"/diensten/data-dashboards/\">data dashboard</a> voor maximaal inzicht in uw bedrijfsprestaties.",
            "aiFaqTitle": "Veelgestelde vragen over AI Automatisering",
            "aiFaq1Q": "Is AI ook geschikt voor kleine bedrijven?",
            "aiFaq1A": "Absoluut. Juist voor kleinere bedrijven kan AI een groot verschil maken door tijdrovende taken te automatiseren. Wij bieden oplossingen die passen bij elk budget.",
            "aiFaq2Q": "Hoe lang duurt het om een AI-oplossing te implementeren?",
            "aiFaq2A": "Simpele automatiseringen kunnen binnen enkele dagen operationeel zijn. Complexere projecten bespreken we uitgebreid, zodat u precies weet wat u kunt verwachten.",
            "aiFaq3Q": "Is mijn data veilig bij het gebruik van AI?",
            "aiFaq3A": "Data privacy heeft onze hoogste prioriteit. Wij adviseren altijd over veilige implementatie en zorgen dat uw data beschermd blijft.",
            "aiFaq4Q": "Wat kost AI-automatisering?",
            "aiFaq4A": "De kosten hangen af van de complexiteit van uw wensen. Neem contact op voor een vrijblijvend gesprek en een offerte op maat.",
            "aiRelatedTitle": "Gerelateerde diensten",

            // Website Page
            "webH1": "Website Laten Maken in <span>Groningen</span> vanaf \u20ac99",
            "webLead": "Een professionele, snelle website die klanten aantrekt en uw verhaal vertelt. Responsive design, SEO-geoptimaliseerd en gebouwd voor resultaat.",
            "webH2Wat": "Uw online visitekaartje, professioneel en betaalbaar",
            "webP1": "Een goede website is onmisbaar in het digitale tijdperk. Of u nu een ondernemer bent die online gevonden wil worden, een webshop wilt starten, of simpelweg een professioneel online visitekaartje nodig heeft \u2013 Creation+Alt+Fix levert snelle, moderne websites die werken.",
            "webP2": "Dankzij onze effici\u00ebnte werkwijze met AI-ondersteuning kunnen wij websites leveren die er niet alleen prachtig uitzien, maar ook razendsnel gebouwd zijn. Geen maandenlange trajecten, maar resultaat in dagen.",
            "webH2Diensten": "Wat wij bouwen",
            "webCard1Title": "One-Page Websites",
            "webCard1P": "Alle informatie op \u00e9\u00e9n overzichtelijke pagina. Perfect als online visitekaartje voor uw bedrijf. Vanaf \u20ac99.",
            "webCard2Title": "Bedrijfswebsites",
            "webCard2P": "Meerdere pagina\u2019s, contactformulieren en een professionele uitstraling. Geschikt voor groeiende bedrijven.",
            "webCard3Title": "Webshops",
            "webCard3P": "Verkoop online met een gebruiksvriendelijke webshop. Inclusief productcatalogus, winkelwagen en betaalintegratie.",
            "webCard4Title": "Landingspagina\u2019s",
            "webCard4P": "Gerichte pagina\u2019s voor campagnes, evenementen of productlanceringen. Geoptimaliseerd voor conversie.",
            "webH2Waarom": "Waarom een website bij Creation+Alt+Fix?",
            "webP3": "Wij bouwen websites met oog voor detail en prestatie. Elke website is responsive (perfect op mobiel), snel ladend en geoptimaliseerd voor zoekmachines. Bekijk onze <a href=\"/#portfolio\">portfolio</a> voor voorbeelden van ons werk.",
            "webP4": "Heeft u al een website maar wilt u deze uitbreiden met <a href=\"/diensten/slimme-automatisering-ai/\">slimme automatisering</a>? Of heeft u behoefte aan een <a href=\"/diensten/data-dashboards/\">dashboard</a> om uw websitedata te analyseren? Wij denken graag mee.",
            "webFaqTitle": "Veelgestelde vragen over websites",
            "webFaq1Q": "Kan ik echt binnen een dag een website hebben?",
            "webFaq1A": "Ja, voor simpele websites zoals een online visitekaartje of landingspagina is dit vaak mogelijk. Neem contact op met uw wensen, dan geven we direct een inschatting.",
            "webFaq2Q": "Wat kost een website bij Creation+Alt+Fix?",
            "webFaq2A": "Onze websites beginnen vanaf \u20ac99 voor een eenvoudige one-pager. Complexere sites en webshops worden op maat geprijsd. Vraag een vrijblijvende offerte.",
            "webFaq3Q": "Wordt mijn website geoptimaliseerd voor Google?",
            "webFaq3A": "Ja, elke website die wij bouwen is SEO-geoptimaliseerd met snelle laadtijden, structured data en mobile-first design. Zo wordt u beter gevonden in Google.",
            "webFaq4Q": "Kan ik mijn website later nog aanpassen?",
            "webFaq4A": "Absoluut. Wij bouwen websites die makkelijk te onderhouden en uit te breiden zijn. Ook bieden wij onderhoudspakketten aan.",
            "webFaq5Q": "Regelen jullie ook hosting en domeinnaam?",
            "webFaq5A": "Ja, wij kunnen het volledige traject verzorgen: domeinnaamregistratie, hosting en het live zetten van uw website.",
            "webRelatedTitle": "Gerelateerde diensten",

            // Dashboard Page
            "dashH1": "Data Dashboards & KPI Inzichten in <span>Groningen</span>",
            "dashLead": "Breng uw bedrijfsdata tot leven met overzichtelijke dashboards. Zie direct hoe uw bedrijf presteert en waar kansen liggen.",
            "dashH2Wat": "Van data naar inzicht",
            "dashP1": "U verzamelt dagelijks data \u2013 van verkoopcijfers en websitebezoeken tot klanttevredenheid en voorraadniveaus. Maar kunt u deze data ook effectief benutten? Creation+Alt+Fix transformeert ruwe data in heldere, visuele dashboards die u helpen betere beslissingen te nemen.",
            "dashP2": "Onze dashboards zijn geen standaard templates. Wij bouwen op maat, afgestemd op uw specifieke KPI\u2019s en bedrijfsdoelen. Zo ziet u in \u00e9\u00e9n oogopslag wat er speelt.",
            "dashH2Diensten": "Wat wij bieden",
            "dashCard1Title": "KPI Dashboards",
            "dashCard1P": "Overzichtelijke dashboards die uw belangrijkste prestatie-indicatoren real-time weergeven. Altijd en overal toegankelijk.",
            "dashCard2Title": "Data Visualisatie",
            "dashCard2P": "Complexe data vertaald naar begrijpelijke grafieken, charts en rapportages die direct inzicht geven.",
            "dashCard3Title": "Geautomatiseerde Rapportages",
            "dashCard3P": "Laat rapportages automatisch genereren en versturen. Bespaar tijd en heb altijd actuele cijfers bij de hand.",
            "dashCard4Title": "Data Integratie",
            "dashCard4P": "Wij koppelen verschillende databronnen \u2013 van spreadsheets tot APIs \u2013 in \u00e9\u00e9n centraal dashboard.",
            "dashH2Waarom": "Waarom data dashboards van Creation+Alt+Fix?",
            "dashP3": "Wij combineren data-expertise met <a href=\"/diensten/slimme-automatisering-ai/\">AI en automatisering</a> om dashboards te bouwen die niet alleen data tonen, maar ook patronen herkennen en aanbevelingen doen. Zo wordt uw data een strategisch wapen.",
            "dashP4": "Een goed dashboard begint bij betrouwbare <a href=\"/diensten/it-support-beheer/\">IT-infrastructuur</a>. Wij zorgen voor het complete plaatje.",
            "dashFaqTitle": "Veelgestelde vragen over Data Dashboards",
            "dashFaq1Q": "Welke data kan ik in een dashboard verwerken?",
            "dashFaq1A": "Vrijwel alle data: verkoopcijfers, websitestatistieken, klanttevredenheid, financiele gegevens, voorraad, social media metrics en meer. Wij adviseren welke KPI\u2019s het meest relevant zijn voor uw bedrijf.",
            "dashFaq2Q": "Heb ik technische kennis nodig om een dashboard te gebruiken?",
            "dashFaq2A": "Nee, onze dashboards zijn ontworpen voor gebruiksgemak. U opent ze in uw browser en ziet direct uw data. Wij geven ook een korte uitleg bij oplevering.",
            "dashFaq3Q": "Hoe lang duurt het om een dashboard te bouwen?",
            "dashFaq3A": "Een basis dashboard kan binnen een week operationeel zijn. Complexere dashboards met meerdere databronnen nemen wat meer tijd in beslag. Wij geven altijd vooraf een tijdsinschatting.",
            "dashFaq4Q": "Wat kost een data dashboard?",
            "dashFaq4A": "De kosten hangen af van de complexiteit en het aantal databronnen. Neem contact op voor een vrijblijvend gesprek en een offerte op maat.",
            "dashRelatedTitle": "Gerelateerde diensten",

            // Shared
            "ctaTitle": "Klaar om te beginnen?",
            "ctaText": "Neem vandaag nog contact op voor een vrijblijvend gesprek. Wij denken graag mee over de beste oplossing voor uw situatie.",
            "ctaCall": "Bel ons",
            "ctaMail": "Mail ons",
            "footerRights": "Alle rechten voorbehouden.",
            "breadcrumbHome": "Home",
            "breadcrumbDiensten": "Diensten",

            // Related cards
            "relITTitle": "IT Support & Beheer",
            "relITP": "Betrouwbare IT-ondersteuning en PC-reparatie",
            "relAITitle": "AI & Automatisering",
            "relAIP": "Slimme automatisering en AI-consultancy",
            "relWebTitle": "Website Laten Maken",
            "relWebP": "Moderne websites en webshops vanaf \u20ac99",
            "relDashTitle": "Data Dashboards",
            "relDashP": "KPI dashboards en data visualisatie"
        },
        'en': {
            // Nav
            "navHome": "Home",
            "navAIServices": "AI Services",
            "navWebDesign": "Web Design & Tech",
            "navProjects": "Projects",
            "navContact": "Contact",

            // Diensten Overview
            "dienstenOverviewTitle": "Our <span>Services</span>",
            "dienstenOverviewSubtitle": "From IT support and AI automation to websites and data dashboards. We offer a complete package of digital solutions for entrepreneurs and individuals in Groningen and surroundings.",
            "dienstenOverviewH1": "Our Services - IT, AI, Websites & Dashboards in <span>Groningen</span>",

            "overzichtITTitle": "IT Support & Management",
            "overzichtITP": "PC repair, network management and reliable IT support for individuals and businesses.",
            "overzichtITBtn": "More about IT Support",
            "overzichtAITitle": "Smart Automation & AI",
            "overzichtAIP": "Workflow automation, AI consultancy and smart business tools that make your work easier.",
            "overzichtAIBtn": "More about AI & Automation",
            "overzichtWebTitle": "Website Development",
            "overzichtWebP": "Modern, fast websites and webshops from \u20ac99. Responsive design, built for results.",
            "overzichtWebBtn": "More about Websites",
            "overzichtDashTitle": "Data Dashboards & Insights",
            "overzichtDashP": "Clear dashboards and KPI reports that bring your business data to life.",
            "overzichtDashBtn": "More about Dashboards",

            // IT Support Page
            "itH1": "IT Support & Management in <span>Groningen</span>",
            "itLead": "Reliable IT support for individuals and SMEs. From PC repair to complete network management \u2013 we ensure your technology works.",
            "itH2Wat": "What we do",
            "itP1": "Whether your computer crashes, your network is slow, or you're dealing with malware \u2013 Creation+Alt+Fix is here for you. With years of experience in IT support, we offer fast, personal help to individuals and businesses in Groningen and surroundings.",
            "itP2": "We believe good IT support is more than just fixing problems. It's about preventing issues, optimizing your systems and ensuring you can focus on what really matters.",
            "itH2Diensten": "Our IT services",
            "itCard1Title": "PC & Mac Repair",
            "itCard1P": "Hardware and software issues? We diagnose and repair your computer quickly and professionally. Including data recovery.",
            "itCard2Title": "Network Management & WiFi",
            "itCard2P": "Need stable internet? We optimize your network, configure routers and ensure reliable WiFi coverage.",
            "itCard3Title": "Virus Removal & Security",
            "itCard3P": "Malware, ransomware or phishing? We remove threats and secure your systems against future attacks.",
            "itCard4Title": "Software Installation & Updates",
            "itCard4P": "From Windows installations to software configuration. We ensure your programs are up-to-date and properly configured.",
            "itH2Waarom": "Why choose Creation+Alt+Fix?",
            "itP3": "We combine traditional IT expertise with modern tools and AI support. This means faster diagnoses, more efficient solutions and lower costs for you. Plus, we speak your language \u2013 no technical jargon, just clear explanations.",
            "itP4": "Have an IT problem you can't solve yourself? Or looking for a reliable partner for ongoing IT management? Combine this with our <a href=\"/diensten/slimme-automatisering-ai/\">AI automation</a> for even smarter solutions.",
            "itFaqTitle": "Frequently asked questions about IT Support",
            "itFaq1Q": "How quickly can you repair my computer?",
            "itFaq1A": "Many common problems are resolved the same day. For more complex repairs, such as hardware replacement or data recovery, we always provide a time estimate in advance.",
            "itFaq2Q": "Do you also come to my home?",
            "itFaq2A": "Yes, we offer on-site IT support in Groningen and surroundings. For many issues, remote support can also provide a quick solution.",
            "itFaq3Q": "How much does IT support at Creation+Alt+Fix cost?",
            "itFaq3A": "We work with transparent rates and always provide a price indication in advance. Contact us for a non-binding quote.",
            "itFaq4Q": "Do you also support Apple / Mac computers?",
            "itFaq4A": "Yes, we offer support for both Windows and macOS systems, including software installation, updates and troubleshooting.",
            "itRelatedTitle": "Related services",

            // AI Page
            "aiH1": "AI Automation & Consultancy in <span>Groningen</span>",
            "aiLead": "Let artificial intelligence work for you. We advise and implement AI solutions that make your work processes faster, smarter and cheaper.",
            "aiH2Wat": "The power of AI for your business",
            "aiP1": "Artificial Intelligence is no longer a future concept \u2013 it's a practical tool that delivers results today. At Creation+Alt+Fix, we translate the possibilities of AI into concrete solutions for your business. No hype, but hands-on implementation that adds immediate value.",
            "aiP2": "Whether you want to automate repetitive tasks, gain smarter insights from your data, or deploy a chatbot for customer service \u2013 we help you from idea to working solution.",
            "aiH2Diensten": "Our AI services",
            "aiCard1Title": "Workflow Automation",
            "aiCard1P": "Automate recurring tasks such as email processing, document generation and data processing. Save hours per week.",
            "aiCard2Title": "AI Consultancy & Strategy",
            "aiCard2P": "Don't know where to start with AI? We analyze your processes and advise where AI has the most impact.",
            "aiCard3Title": "Chatbots & Customer Interaction",
            "aiCard3P": "Intelligent chatbots that answer questions 24/7, schedule appointments and generate leads for your business.",
            "aiCard4Title": "Smart Business Tools",
            "aiCard4P": "From quote generators to CRM systems \u2013 we build custom tools powered by AI.",
            "aiH2Waarom": "Why AI with Creation+Alt+Fix?",
            "aiP3": "We make AI accessible and affordable for SMEs. You don't need to be a tech expert \u2013 you tell us your wish in clear language and we handle the technical implementation. Through our combination of <a href=\"/diensten/it-support-beheer/\">IT expertise</a> and AI knowledge, we deliver solutions that seamlessly integrate into your existing workflow.",
            "aiP4": "Combine AI automation with a <a href=\"/diensten/data-dashboards/\">data dashboard</a> for maximum insight into your business performance.",
            "aiFaqTitle": "Frequently asked questions about AI Automation",
            "aiFaq1Q": "Is AI also suitable for small businesses?",
            "aiFaq1A": "Absolutely. Especially for smaller businesses, AI can make a big difference by automating time-consuming tasks. We offer solutions that fit every budget.",
            "aiFaq2Q": "How long does it take to implement an AI solution?",
            "aiFaq2A": "Simple automations can be operational within a few days. More complex projects are discussed extensively, so you know exactly what to expect.",
            "aiFaq3Q": "Is my data safe when using AI?",
            "aiFaq3A": "Data privacy is our highest priority. We always advise on secure implementation and ensure your data remains protected.",
            "aiFaq4Q": "What does AI automation cost?",
            "aiFaq4A": "Costs depend on the complexity of your requirements. Contact us for a non-binding conversation and a custom quote.",
            "aiRelatedTitle": "Related services",

            // Website Page
            "webH1": "Website Development in <span>Groningen</span> from \u20ac99",
            "webLead": "A professional, fast website that attracts customers and tells your story. Responsive design, SEO-optimized and built for results.",
            "webH2Wat": "Your online business card, professional and affordable",
            "webP1": "A good website is essential in the digital age. Whether you're an entrepreneur who wants to be found online, want to start a webshop, or simply need a professional online business card \u2013 Creation+Alt+Fix delivers fast, modern websites that work.",
            "webP2": "Thanks to our efficient approach with AI support, we can deliver websites that not only look beautiful but are also built at lightning speed. No month-long projects, but results in days.",
            "webH2Diensten": "What we build",
            "webCard1Title": "One-Page Websites",
            "webCard1P": "All information on one clear page. Perfect as an online business card for your company. From \u20ac99.",
            "webCard2Title": "Business Websites",
            "webCard2P": "Multiple pages, contact forms and a professional appearance. Suitable for growing businesses.",
            "webCard3Title": "Webshops",
            "webCard3P": "Sell online with a user-friendly webshop. Including product catalog, shopping cart and payment integration.",
            "webCard4Title": "Landing Pages",
            "webCard4P": "Targeted pages for campaigns, events or product launches. Optimized for conversion.",
            "webH2Waarom": "Why a website from Creation+Alt+Fix?",
            "webP3": "We build websites with attention to detail and performance. Every website is responsive (perfect on mobile), fast-loading and optimized for search engines. Check our <a href=\"/#portfolio\">portfolio</a> for examples of our work.",
            "webP4": "Already have a website but want to extend it with <a href=\"/diensten/slimme-automatisering-ai/\">smart automation</a>? Or need a <a href=\"/diensten/data-dashboards/\">dashboard</a> to analyze your website data? We're happy to help.",
            "webFaqTitle": "Frequently asked questions about websites",
            "webFaq1Q": "Can I really have a website within a day?",
            "webFaq1A": "Yes, for simple websites like an online business card or landing page, this is often possible. Contact us with your wishes and we'll give you an estimate right away.",
            "webFaq2Q": "What does a website at Creation+Alt+Fix cost?",
            "webFaq2A": "Our websites start from \u20ac99 for a simple one-pager. More complex sites and webshops are custom-priced. Request a non-binding quote.",
            "webFaq3Q": "Will my website be optimized for Google?",
            "webFaq3A": "Yes, every website we build is SEO-optimized with fast loading times, structured data and mobile-first design. This helps you rank better in Google.",
            "webFaq4Q": "Can I modify my website later?",
            "webFaq4A": "Absolutely. We build websites that are easy to maintain and expand. We also offer maintenance packages.",
            "webFaq5Q": "Do you also arrange hosting and domain name?",
            "webFaq5A": "Yes, we can handle the complete process: domain name registration, hosting and going live with your website.",
            "webRelatedTitle": "Related services",

            // Dashboard Page
            "dashH1": "Data Dashboards & KPI Insights in <span>Groningen</span>",
            "dashLead": "Bring your business data to life with clear dashboards. See at a glance how your business is performing and where opportunities lie.",
            "dashH2Wat": "From data to insight",
            "dashP1": "You collect data daily \u2013 from sales figures and website visits to customer satisfaction and stock levels. But can you effectively use this data? Creation+Alt+Fix transforms raw data into clear, visual dashboards that help you make better decisions.",
            "dashP2": "Our dashboards are not standard templates. We build custom, tailored to your specific KPIs and business goals. So you can see at a glance what's happening.",
            "dashH2Diensten": "What we offer",
            "dashCard1Title": "KPI Dashboards",
            "dashCard1P": "Clear dashboards that display your most important performance indicators in real-time. Accessible anytime, anywhere.",
            "dashCard2Title": "Data Visualization",
            "dashCard2P": "Complex data translated into understandable graphs, charts and reports that provide immediate insight.",
            "dashCard3Title": "Automated Reports",
            "dashCard3P": "Have reports automatically generated and sent. Save time and always have current figures at hand.",
            "dashCard4Title": "Data Integration",
            "dashCard4P": "We connect various data sources \u2013 from spreadsheets to APIs \u2013 in one central dashboard.",
            "dashH2Waarom": "Why data dashboards from Creation+Alt+Fix?",
            "dashP3": "We combine data expertise with <a href=\"/diensten/slimme-automatisering-ai/\">AI and automation</a> to build dashboards that not only display data but also recognize patterns and make recommendations. This way, your data becomes a strategic weapon.",
            "dashP4": "A good dashboard starts with reliable <a href=\"/diensten/it-support-beheer/\">IT infrastructure</a>. We take care of the complete picture.",
            "dashFaqTitle": "Frequently asked questions about Data Dashboards",
            "dashFaq1Q": "What data can I process in a dashboard?",
            "dashFaq1A": "Almost any data: sales figures, website statistics, customer satisfaction, financial data, inventory, social media metrics and more. We advise which KPIs are most relevant for your business.",
            "dashFaq2Q": "Do I need technical knowledge to use a dashboard?",
            "dashFaq2A": "No, our dashboards are designed for ease of use. You open them in your browser and immediately see your data. We also provide a brief explanation upon delivery.",
            "dashFaq3Q": "How long does it take to build a dashboard?",
            "dashFaq3A": "A basic dashboard can be operational within a week. More complex dashboards with multiple data sources take a bit more time. We always provide a time estimate in advance.",
            "dashFaq4Q": "What does a data dashboard cost?",
            "dashFaq4A": "Costs depend on complexity and the number of data sources. Contact us for a non-binding conversation and a custom quote.",
            "dashRelatedTitle": "Related services",

            // Shared
            "ctaTitle": "Ready to get started?",
            "ctaText": "Contact us today for a non-binding conversation. We're happy to help you find the best solution for your situation.",
            "ctaCall": "Call us",
            "ctaMail": "Email us",
            "footerRights": "All rights reserved.",
            "breadcrumbHome": "Home",
            "breadcrumbDiensten": "Services",

            // Related cards
            "relITTitle": "IT Support & Management",
            "relITP": "Reliable IT support and PC repair",
            "relAITitle": "AI & Automation",
            "relAIP": "Smart automation and AI consultancy",
            "relWebTitle": "Website Development",
            "relWebP": "Modern websites and webshops from \u20ac99",
            "relDashTitle": "Data Dashboards",
            "relDashP": "KPI dashboards and data visualization"
        }
    };

    let currentLanguage = 'nl';

    function applyTranslations(lang) {
        if (!translations[lang]) return;
        currentLanguage = lang;
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-translate-key]').forEach(function(el) {
            var key = el.getAttribute('data-translate-key');
            if (translations[lang][key] !== undefined) {
                el.innerHTML = translations[lang][key];
            }
        });

        var titleEl = document.querySelector('title[data-translate-key]');
        if (titleEl) {
            var key = titleEl.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                document.title = translations[lang][key];
            }
        }

        document.querySelectorAll('#language-switcher .lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    function initializeLanguage() {
        var saved = localStorage.getItem('preferredLanguage');
        var browser = navigator.language.split('-')[0];
        var lang = 'nl';
        if (saved && translations[saved]) {
            lang = saved;
        } else if (translations[browser]) {
            lang = browser;
        }
        applyTranslations(lang);
        localStorage.setItem('preferredLanguage', lang);
    }

    initializeLanguage();

    document.querySelectorAll('#language-switcher .lang-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var lang = this.getAttribute('data-lang');
            applyTranslations(lang);
            localStorage.setItem('preferredLanguage', lang);
        });
    });

    // Footer year
    var yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Hamburger menu
    var hamburgerBtn = document.getElementById('hamburger-menu');
    var navMenuItems = document.getElementById('nav-menu-items');
    if (hamburgerBtn && navMenuItems) {
        var hamburgerIcon = hamburgerBtn.querySelector('i');
        hamburgerBtn.addEventListener('click', function() {
            navMenuItems.classList.toggle('active');
            var isActive = navMenuItems.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isActive);
            if (hamburgerIcon) {
                hamburgerIcon.classList.toggle('fa-bars', !isActive);
                hamburgerIcon.classList.toggle('fa-times', isActive);
            }
        });

        navMenuItems.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (navMenuItems.classList.contains('active')) {
                    navMenuItems.classList.remove('active');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                    if (hamburgerIcon) {
                        hamburgerIcon.classList.remove('fa-times');
                        hamburgerIcon.classList.add('fa-bars');
                    }
                }
            });
        });
    }
});
