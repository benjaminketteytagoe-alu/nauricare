// Multilingual content for NauriCare landing page
export type Language = 'en' | 'sw' | 'rw';

export interface Translations {
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ctaTertiary: string;
  };
  form: {
    name: string;
    emailOrPhone: string;
    country: string;
    language: string;
    role: string;
    roleOptions: {
      user: string;
      provider: string;
      partner: string;
    };
    submit: string;
    successTitle: string;
    successMessage: string;
  };
  features: {
    title: string;
    items: {
      ai: { title: string; description: string };
      referral: { title: string; description: string };
      ussd: { title: string; description: string };
      teleconsult: { title: string; description: string };
      education: { title: string; description: string };
    };
  };
  howItWorks: {
    title: string;
    steps: {
      step1: { title: string; description: string };
      step2: { title: string; description: string };
      step3: { title: string; description: string };
    };
  };
  testimonials: {
    title: string;
    items: {
      test1: { quote: string; name: string; location: string };
      test2: { quote: string; name: string; location: string };
      test3: { quote: string; name: string; location: string };
    };
  };
  healthStats: {
    title: string;
    subtitle: string;
    stats: {
      pcos: { number: string; label: string; fact: string };
      fibroids: { number: string; label: string; fact: string };
      undiagnosed: { number: string; label: string; fact: string };
      treatment: { number: string; label: string; fact: string };
    };
    whyNauricare: {
      title: string;
      reasons: string[];
    };
  };
  partners: {
    title: string;
    description: string;
    cta: string;
  };
  footer: {
    tagline: string;
    privacy: string;
    terms: string;
    contact: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    hero: {
      headline: "Accessible, trusted women's health support — anytime, anywhere",
      subheadline: "AI symptom guidance, local-language support, teleconsults and USSD for women across Africa",
      ctaPrimary: "Join Waitlist",
      ctaSecondary: "How it Works",
      ctaTertiary: "For Partners",
    },
    form: {
      name: "Full Name",
      emailOrPhone: "Email or Phone",
      country: "Country",
      language: "Preferred Language",
      role: "I am a...",
      roleOptions: {
        user: "User seeking care",
        provider: "Healthcare provider",
        partner: "Partner/Donor",
      },
      submit: "Join Waitlist",
      successTitle: "Welcome to NauriCare!",
      successMessage: "Thank you for joining our waitlist. We'll be in touch soon with updates.",
    },
    features: {
      title: "Comprehensive Women's Health Support",
      items: {
        ai: {
          title: "AI Symptom Checker",
          description: "Get instant, intelligent symptom analysis in your local language, guiding you to the right care",
        },
        referral: {
          title: "Referral Engine",
          description: "Connect with trusted local healthcare providers and specialists in your area",
        },
        ussd: {
          title: "USSD Access",
          description: "No smartphone? No problem. Access health guidance via simple USSD codes on any mobile phone",
        },
        teleconsult: {
          title: "Teleconsultations",
          description: "Video or voice consultations with qualified healthcare providers from the comfort of home",
        },
        education: {
          title: "Health Education",
          description: "Learn about women's health topics through culturally relevant, easy-to-understand resources",
        },
      },
    },
    howItWorks: {
      title: "How it Works",
      steps: {
        step1: {
          title: "Share Your Symptoms",
          description: "Describe how you're feeling using our AI-powered symptom checker, available in your language",
        },
        step2: {
          title: "Get Guidance",
          description: "Receive personalized health guidance and recommendations for next steps",
        },
        step3: {
          title: "Connect to Care",
          description: "Book teleconsults or get referred to trusted local providers when needed",
        },
      },
    },
    testimonials: {
      title: "What Women Are Saying",
      items: {
        test1: {
          quote: "NauriCare helped me understand my symptoms and connect with a doctor in my area. I feel empowered about my health.",
          name: "Amara N.",
          location: "Nairobi, Kenya",
        },
        test2: {
          quote: "Even without a smartphone, I can access health information through USSD. It's been life-changing.",
          name: "Grace M.",
          location: "Kampala, Uganda",
        },
        test3: {
          quote: "As a healthcare provider, NauriCare helps me reach more women who need care. It's bridging the gap.",
          name: "Dr. Fatima S.",
          location: "Kigali, Rwanda",
        },
      },
    },
    healthStats: {
      title: "The Silent Crisis Affecting Millions of Women",
      subtitle: "PCOS and Fibroids are widespread but often go undiagnosed. Early detection and proper management can transform lives.",
      stats: {
        pcos: {
          number: "1 in 10",
          label: "women have PCOS",
          fact: "Polycystic Ovary Syndrome affects 116 million women globally, yet 70% remain undiagnosed",
        },
        fibroids: {
          number: "70-80%",
          label: "of women develop fibroids",
          fact: "By age 50, most women will develop uterine fibroids, with African women at highest risk",
        },
        undiagnosed: {
          number: "60%",
          label: "go undiagnosed",
          fact: "Limited access to healthcare means most cases remain undetected until complications arise",
        },
        treatment: {
          number: "5-7 years",
          label: "average diagnosis delay",
          fact: "Women wait years for proper diagnosis, during which conditions worsen and fertility risks increase",
        },
      },
      whyNauricare: {
        title: "Why NauriCare is Essential for Every Woman",
        reasons: [
          "Early symptom detection through AI-powered screening can prevent complications",
          "Accessible healthcare guidance in your local language, breaking down barriers",
          "Direct connection to specialists who understand PCOS and fibroid management",
          "No smartphone needed — USSD access ensures no woman is left behind",
          "Ongoing education helps you understand your body and advocate for your health",
          "Teleconsultations provide expert care without expensive travel or time off work",
        ],
      },
    },
    partners: {
      title: "Partner With Us",
      description: "Are you a healthcare provider, NGO, or donor? Join us in making women's health accessible across Africa.",
      cta: "Become a Partner",
    },
    footer: {
      tagline: "Empowering women's health across Africa",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      contact: "Contact Us",
    },
  },
  sw: {
    hero: {
      headline: "Usaidizi wa afya wa wanawake unapatikana, unaaminika — wakati wowote, mahali popote",
      subheadline: "Mwongozo wa dalili za AI, msaada wa lugha za mitaa, mashauriano ya umbali na USSD kwa wanawake kote Afrika",
      ctaPrimary: "Jiunge na Orodha ya Kusubiri",
      ctaSecondary: "Jinsi Inavyofanya Kazi",
      ctaTertiary: "Kwa Washirika",
    },
    form: {
      name: "Jina Kamili",
      emailOrPhone: "Barua Pepe au Simu",
      country: "Nchi",
      language: "Lugha Unayopendelea",
      role: "Mimi ni...",
      roleOptions: {
        user: "Mtumiaji anayetafuta huduma",
        provider: "Mtoa huduma za afya",
        partner: "Mshirika/Mfadhili",
      },
      submit: "Jiunge na Orodha ya Kusubiri",
      successTitle: "Karibu NauriCare!",
      successMessage: "Asante kwa kujiunga na orodha yetu ya kusubiri. Tutawasiliana nawe hivi karibuni.",
    },
    features: {
      title: "Usaidizi Kamili wa Afya ya Wanawake",
      items: {
        ai: {
          title: "Mtambuzi wa Dalili za AI",
          description: "Pata uchambuzi wa haraka wa dalili kwa lugha yako ya mitaa, kukuongoza kwa huduma sahihi",
        },
        referral: {
          title: "Injini ya Rufaa",
          description: "Unganishwa na watoa huduma za afya wanaoaminika na wataalam kwenye eneo lako",
        },
        ussd: {
          title: "Ufikiaji wa USSD",
          description: "Huna simu mahiri? Hakuna shida. Fikia mwongozo wa afya kupitia msimbo rahisi wa USSD kwenye simu yoyote",
        },
        teleconsult: {
          title: "Mashauriano ya Umbali",
          description: "Video au sauti mashauriano na watoa huduma wa afya wenye sifa kutoka ustarehe wa nyumbani",
        },
        education: {
          title: "Elimu ya Afya",
          description: "Jifunze kuhusu mada za afya ya wanawake kupitia rasilimali zinazofaa kitamaduni na rahisi kueleweka",
        },
      },
    },
    howItWorks: {
      title: "Jinsi Inavyofanya Kazi",
      steps: {
        step1: {
          title: "Shiriki Dalili Zako",
          description: "Eleza jinsi unavyohisi kwa kutumia mtambuzi wetu wa dalili unaotumia AI, unapatikana kwa lugha yako",
        },
        step2: {
          title: "Pata Mwongozo",
          description: "Pokea mwongozo wa afya ulioboreshwa na mapendekezo ya hatua zinazofuata",
        },
        step3: {
          title: "Unganishwa na Huduma",
          description: "Weka miadi ya mashauriano ya umbali au upate rufaa kwa watoa huduma wanaoaminika pale inapohitajika",
        },
      },
    },
    testimonials: {
      title: "Wanawake Wanasema Nini",
      items: {
        test1: {
          quote: "NauriCare ilinisaidia kuelewa dalili zangu na kuunganishwa na daktari katika eneo langu. Nahisi nina nguvu kuhusu afya yangu.",
          name: "Amara N.",
          location: "Nairobi, Kenya",
        },
        test2: {
          quote: "Hata bila simu mahiri, ninaweza kupata habari za afya kupitia USSD. Imebadilisha maisha yangu.",
          name: "Grace M.",
          location: "Kampala, Uganda",
        },
        test3: {
          quote: "Kama mtoa huduma za afya, NauriCare inanisaidia kufikia wanawake wengi wanaohitaji huduma. Inaziba pengo.",
          name: "Dk. Fatima S.",
          location: "Kigali, Rwanda",
        },
      },
    },
    healthStats: {
      title: "Matatizo ya Kimya Yanayoathiri Mamilioni ya Wanawake",
      subtitle: "PCOS na Fibroids ni ya kawaida lakini mara nyingi hazitambuliwi. Utambuzi wa mapema na usimamizi sahihi unaweza kubadilisha maisha.",
      stats: {
        pcos: {
          number: "1 kati ya 10",
          label: "wanawake wana PCOS",
          fact: "Ugonjwa wa Ovari za Polycystic unaathiri wanawake milioni 116 ulimwenguni, lakini 70% hawajatambuliwa",
        },
        fibroids: {
          number: "70-80%",
          label: "ya wanawake hupata fibroids",
          fact: "Kufikia umri wa miaka 50, wanawake wengi watakuwa na fibroids za kizazi, wanawake wa Kiafrika wakiwa katika hatari kubwa zaidi",
        },
        undiagnosed: {
          number: "60%",
          label: "hawajatambuliwa",
          fact: "Ukosekanaji wa huduma za afya inamaanisha visa vingi vinabakia visivyotambuliwa mpaka matatizo yanapojitokeza",
        },
        treatment: {
          number: "Miaka 5-7",
          label: "ucheleweshwaji wa wastani wa utambuzi",
          fact: "Wanawake husubiri miaka kwa utambuzi sahihi, wakati hali inazidi kuwa mbaya na hatari za uzazi zinaongezeka",
        },
      },
      whyNauricare: {
        title: "Kwa Nini NauriCare ni Muhimu kwa Kila Mwanamke",
        reasons: [
          "Utambuzi wa mapema wa dalili kupitia uchunguzi unaotumia AI unaweza kuzuia matatizo",
          "Mwongozo wa huduma za afya unapatikana kwa lugha yako ya mitaa, ukivunja vikwazo",
          "Muunganisho wa moja kwa moja na wataalam wanaoeelewa usimamizi wa PCOS na fibroids",
          "Hakuna haja ya simu mahiri — ufikiaji wa USSD unahakikisha hakuna mwanamke anayeachwa nyuma",
          "Elimu inayoendelea inakusaidia kuelewa mwili wako na kutetea afya yako",
          "Mashauriano ya telemedicine hutoa huduma ya kitaalam bila usafiri wa gharama kubwa au mapumziko ya kazi",
        ],
      },
    },
    partners: {
      title: "Shikamana Nasi",
      description: "Je, wewe ni mtoa huduma za afya, NGO, au mfadhili? Jiunge nasi katika kufanya afya ya wanawake ipatikane kote Afrika.",
      cta: "Kuwa Mshirika",
    },
    footer: {
      tagline: "Kuwezesha afya ya wanawake kote Afrika",
      privacy: "Sera ya Faragha",
      terms: "Masharti ya Huduma",
      contact: "Wasiliana Nasi",
    },
  },
  rw: {
    hero: {
      headline: "Ubufasha bw'ubuzima bw'abagore buborohewe, bwizewe — igihe cyose, ahantu hose",
      subheadline: "Ubuyobozi bw'ibimenyetso bya AI, ubufasha mu ndimi z'ibanze, inama za telemedicine na USSD ku bagore muri Afrika yose",
      ctaPrimary: "Kwiyandikisha ku Rutonde",
      ctaSecondary: "Uko Bikora",
      ctaTertiary: "Ku Bafatanyabikorwa",
    },
    form: {
      name: "Amazina Yombi",
      emailOrPhone: "Imeri cyangwa Telefone",
      country: "Igihugu",
      language: "Ururimi Ukunda",
      role: "Ndi...",
      roleOptions: {
        user: "Umukoresha ashaka ubuvuzi",
        provider: "Umutanga serivisi z'ubuzima",
        partner: "Umufatanyabikorwa/Umuterankunga",
      },
      submit: "Kwiyandikisha ku Rutonde",
      successTitle: "Murakaza neza kuri NauriCare!",
      successMessage: "Urakoze kwiyandikisha ku rutonde rwacu. Tuzakuvugisha vuba twagufasha amakuru.",
    },
    features: {
      title: "Ubufasha Busesuye bw'Ubuzima bw'Abagore",
      items: {
        ai: {
          title: "Igenzura ry'Ibimenyetso rya AI",
          description: "Kubona isesengura ry'ibimenyetso ryihuse kandi ryubwenge mu rurimi rwawe, rikuyobora ku buvuzi bukwiriye",
        },
        referral: {
          title: "Sisitemu yo Kohereza ku Buvuzi",
          description: "Guhuza n'abatanga serivisi z'ubuzima bizigwa n'inzobere zo mu gace kawe",
        },
        ussd: {
          title: "Kugera kuri USSD",
          description: "Nta telefone mahitsi? Nta kibazo. Kubona ubuyobozi bw'ubuzima ukoresheje kode yoroheje ya USSD kuri telefone iyo ari yo yose",
        },
        teleconsult: {
          title: "Inama za Telemedicine",
          description: "Amashusho cyangwa ijwi inama n'abatanga serivisi z'ubuzima bafite ubushobozi mu cyumba cyawe",
        },
        education: {
          title: "Kwigisha Ubuzima",
          description: "Wige ku ngingo z'ubuzima bw'abagore binyuze mu bikoresho bijyanye n'umuco kandi byoroshye gusobanukirwa",
        },
      },
    },
    howItWorks: {
      title: "Uko Bikora",
      steps: {
        step1: {
          title: "Sangiza Ibimenyetso Byawe",
          description: "Sobanura uko umereye ukoresheje igenzura ryacu ry'ibimenyetso rikoresha AI, riraboneka mu rurimi rwawe",
        },
        step2: {
          title: "Kubona Ubuyobozi",
          description: "Kwakira ubuyobozi bw'ubuzima bwifashishijwe n'ibyifuzo by'intambwe zikurikira",
        },
        step3: {
          title: "Guhuza n'Ubuvuzi",
          description: "Gutumiza inama za telemedicine cyangwa koherezwa ku batanga serivisi bizigwa iyo bibaye ngombwa",
        },
      },
    },
    testimonials: {
      title: "Abagore Bavuga Iki",
      items: {
        test1: {
          quote: "NauriCare yanjije gusobanukirwa ibimenyetso byanjye no guhuza na muganga mu gace kanjye. Numva ndi imbaraga ku buzima bwanjye.",
          name: "Amara N.",
          location: "Nairobi, Kenya",
        },
        test2: {
          quote: "Na nubwo nta telefone mahitsi mfite, nshobora kubona amakuru y'ubuzima ukoresheje USSD. Byahinduye ubuzima bwanjye.",
          name: "Grace M.",
          location: "Kampala, Uganda",
        },
        test3: {
          quote: "Nk'umutanga serivisi z'ubuzima, NauriCare imfasha kugera ku bagore benshi bakeneye ubuvuzi. Iraziba icyuho.",
          name: "Dr. Fatima S.",
          location: "Kigali, Rwanda",
        },
      },
    },
    healthStats: {
      title: "Ikibazo cy'Amahirwe Kigira Ingaruka ku Bagore Benshi",
      subtitle: "PCOS na Fibroids bikunze cyane ariko bikenshi ntibimenyekane. Kuzimenyekanisha kare no kuzikurikirana neza bishobora guhindura ubuzima.",
      stats: {
        pcos: {
          number: "1 muri 10",
          label: "abagore bafite PCOS",
          fact: "Indwara ya Polycystic Ovary igira ingaruka ku bagore miliyoni 116 ku isi, ariko 70% ntibamenyekana",
        },
        fibroids: {
          number: "70-80%",
          label: "by'abagore bakura fibroids",
          fact: "Bageze ku myaka 50, abagore benshi bazaba bafite fibroids zo mu mura, abagore b'Abanyafurika bakaba ari bo bafite ibyago byinshi",
        },
        undiagnosed: {
          number: "60%",
          label: "ntibamenyekana",
          fact: "Kubura ubuvuzi bihagije bitera ko ibibazo byinshi bibera bidasubizwa kugeza igihe ingorane zivutse",
        },
        treatment: {
          number: "Imyaka 5-7",
          label: "igihe cyo gutinda kuzimenyekanisha",
          fact: "Abagore bategereza imyaka kugira ngo bamenye neza indwara, mugihe aho imiterere irushya kandi ingorane zo kubyara zirahura",
        },
      },
      whyNauricare: {
        title: "Impamvu NauriCare ari Ngombwa kuri Buri Mugore",
        reasons: [
          "Kuzimenyekanisha kare ibimenyetso binyuze mu gukoresha AI bishobora gukumira ingorane",
          "Ubuyobozi bw'ubuvuzi buboroheye mu rurimi rwawe, bukuraho inzitizi",
          "Guhuza na inzobere zishoboye kumenya imyitwarire ya PCOS na fibroids",
          "Nta telefone mahitsi ikenewe — kubona USSD biratuma nta mugore usigara inyuma",
          "Uburezi bukomeza bugufasha gusobanukirwa umubiri wawe no kurwanirira ubuzima bwawe",
          "Inama za telemedicine zitanga ubuvuzi bw'inzobere nta ngendo ihenze cyangwa ikiruhuko cy'akazi",
        ],
      },
    },
    partners: {
      title: "Dufatanye",
      description: "Uri umutanga serivisi z'ubuzima, umuryango udaharanira inyungu, cyangwa umuterankunga? Dufatanye mu gukora ubuzima bw'abagore buborohewe muri Afrika yose.",
      cta: "Kuba Umufatanyabikorwa",
    },
    footer: {
      tagline: "Guha imbaraga ubuzima bw'abagore muri Afrika yose",
      privacy: "Politiki y'Ibanga",
      terms: "Amategeko y'Imikoreshereze",
      contact: "Duvugishe",
    },
  },
};
