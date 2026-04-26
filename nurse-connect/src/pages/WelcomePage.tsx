import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Award, Users, ChevronRight, Phone, Heart, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-banner.svg";
import nurse1 from "@/assets/nurses/nurse-1.jpg";
import nurse2 from "@/assets/nurses/nurse-2.jpg";
import nurse3 from "@/assets/nurses/nurse-3.jpg";
import caritasHospitalImage from "../../nurse-photo/hospital/caritas.jpeg";
import hdpHospitalImage from "../../nurse-photo/hospital/hdp.png";
import kmmHospitalImage from "../../nurse-photo/hospital/kmm.jpeg";
import familyHospitalImage from "../../nurse-photo/hospital/caritasfamily.jpeg";
import mathaHospitalImage from "../../nurse-photo/hospital/caritasMatha.jpeg";

const slides = [
  { image: nurse1, title: "Guided by Expertise, Defined by Compassion", subtitle: "Experience healthcare at its finest at Caritas Hospital" },
  { image: nurse2, title: "65 Years of Healing, a Legacy of Excellence", subtitle: "A tapestry of excellence redefining healthcare since 1959" },
  { image: nurse3, title: "Walking in Compassion, Serving with Love", subtitle: "Fostering a healing environment driven by genuine warmth" },
];

const WelcomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary sticky top-0 z-50 shadow-healthcare">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Caritas Hospital" className="h-12 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">About</a>
            <a href="#departments" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Departments</a>
            <a href="#location" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Location</a>
            <a href="#awards" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Accreditations</a>
            <div className="ml-4 flex gap-2">
              <Link to="/login"><Button variant="pink" size="sm">Login</Button></Link>
            </div>
          </nav>

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-primary-foreground md:hidden">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="border-t border-primary-foreground/10 px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-2 pt-2">
              <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">About</a>
              <a href="#departments" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Departments</a>
              <a href="#location" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Location</a>
              <a href="#awards" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Accreditations</a>
              <div className="mt-2 flex flex-col gap-2">
                <Link to="/login"><Button variant="pink" size="sm" className="w-full">Login</Button></Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Emergency Banner */}
      <div className="bg-destructive/10 border-b border-destructive/20 py-2">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm">
          <Phone size={14} className="text-destructive" />
          <span className="font-medium text-destructive">24x7 Emergency:</span>
          <a href="tel:9496555200" className="font-bold text-destructive hover:underline">+91(0) 9496 555 200</a>
        </div>
      </div>

      {/* Hero Carousel */}
      <section className="relative h-[500px] overflow-hidden md:h-[600px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
              <h2 className="text-3xl font-bold text-primary-foreground md:text-5xl animate-fade-in">{slide.title}</h2>
              <p className="mt-2 text-lg text-primary-foreground/80 md:text-xl">{slide.subtitle}</p>
              <Link to="/login">
                <Button variant="pink" size="lg" className="mt-6">
                  Staff Login <ChevronRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all ${i === currentSlide ? "w-8 bg-accent" : "w-2.5 bg-primary-foreground/50"}`}
            />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">About <span className="text-primary">Caritas Hospital</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Caritas Hospital & Institute of Health Sciences, Kottayam, Kerala — a NABH-accredited multi-specialty hospital with 65+ years of excellence in patient care, powered by a dedicated team of professionals committed to compassion and clinical innovation.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Stethoscope, title: "16 Departments", desc: "From Cancer Institute to Urology — comprehensive Centres of Excellence across all medical specialties" },
              { icon: Users, title: "Dedicated Nurses", desc: "A highly trained nursing staff with NABH Nursing Excellence certification, ensuring round-the-clock care" },
              { icon: Heart, title: "65+ Years of Healing", desc: "Great Place to Work certified, Diamond Status by WSO for Excellence in Stroke Care" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-card p-6 shadow-card transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Centres of <span className="text-primary">Excellence</span></h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Discover exceptional care through our specialized centres</p>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Caritas Cancer Institute", "Caritas Heart Institute", "Caritas Neuro Sciences",
              "Critical Care Medicine", "Dermatology & Cosmetology", "Emergency Medicine & Trauma Care",
              "Gastro Sciences", "General Medicine", "General Surgery",
              "Nephrology & Renal Transplant", "Obstetrics & Gynaecology",
              "Orthopaedics & Joint Replacement", "Paediatrics & Paediatric Surgery",
              "Physical Medicine & Rehabilitation", "Rheumatology", "Urology",
            ].map((dept) => (
              <div key={dept} className="rounded-lg bg-background px-4 py-3 shadow-sm border text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors">
                {dept}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="bg-[#f1f1f1] py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Our <span className="text-primary">Location</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">Discover our network of exceptional hospitals, each committed to providing comprehensive healthcare with expertise and compassion.</p>

          <div className="mt-12">
            <h3 className="mb-4 text-center text-xl font-semibold text-foreground">Caritas Hospital & Institute of Health Sciences</h3>
            {[
              {
                name: "Caritas Hospital & Institute of Health Sciences",
                addressLine1: "Thellakom P.O., Kottayam",
                addressLine2: "Kerala - 686630",
                phone: "0481 2792500",
                link: "https://www.caritashospital.org/",
                image: caritasHospitalImage,
                alt: "Caritas Hospital & Institute of Health Sciences",
              },
            ].map((hospital) => (
              <div key={hospital.name} className="box-container marged animation-element bounce-up in-view mx-auto flex max-w-xl justify-center">
                <div className="block revealOnScroll rounded-xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" data-animation="flipInX" data-timeout="300">
                  <div className="image overflow-hidden rounded-xl">
                    <img src={hospital.image} alt={hospital.alt} className="box-image h-[170px] w-full object-cover" />
                    <div className="box-content bg-white p-6">
                      <h5 className="text-lg font-bold leading-tight text-foreground">{hospital.name}</h5>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        {hospital.addressLine1}
                        <br />
                        {hospital.addressLine2}
                      </span>
                      <h6 className="mt-3 text-xl font-bold leading-none text-foreground">{hospital.phone}</h6>
                      <div className="mt-4">
                        <a href={hospital.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#C71782] transition-opacity hover:opacity-80">
                          Know More <ChevronRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <h3 className="mb-6 text-xl font-semibold text-foreground">Our Other Locations</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {[
                {
                  name: "Caritas HDP Hospital",
                  addressLine1: "Kaipuzha, Kottayam",
                  addressLine2: "Kerala - 686602",
                  phone: "0481 2711418",
                  link: "https://www.caritashospital.org/",
                  image: hdpHospitalImage,
                  alt: "Caritas HDP Hospital",
                },
                {
                  name: "Caritas KMM Hospital",
                  addressLine1: "Thiruvathukkal Rd, Puthenangady",
                  addressLine2: "Kottayam, Kerala - 686001",
                  phone: "0481 2580047",
                  link: "https://www.caritashospital.org/",
                  image: kmmHospitalImage,
                  alt: "Caritas KMM Hospital",
                },
                {
                  name: "Caritas Family Hospital",
                  addressLine1: "Karipal Building, Vadavathoor P.O",
                  addressLine2: "Kalathipady, Kerala - 686018",
                  phone: "0481 2570100",
                  link: "https://www.caritasfamilyhospital.com/",
                  image: familyHospitalImage,
                  alt: "Caritas Family Hospital",
                },
                {
                  name: "Caritas Matha Hospital",
                  addressLine1: "MC Road, Thellakom (P.O),",
                  addressLine2: "Kottayam, Kerala - 686630",
                  phone: "0481 2792500",
                  link: "https://caritasmathahospital.com/",
                  image: mathaHospitalImage,
                  alt: "Caritas Matha Hospital",
                },
              ].map((hospital) => (
                <div key={hospital.name} className="box-container marged animation-element bounce-up in-view">
                  <div className="block revealOnScroll rounded-xl bg-white p-0 shadow-card transition-transform hover:-translate-y-1" data-animation="flipInX" data-timeout="300">
                    <div className="image overflow-hidden rounded-xl">
                      <img src={hospital.image} alt={hospital.alt} className="box-image h-[145px] w-full object-cover" />
                      <div className="box-content bg-white p-6">
                        <h5 className="text-lg font-bold leading-tight text-foreground">{hospital.name}</h5>
                        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                          {hospital.addressLine1}
                          <br />
                          {hospital.addressLine2}
                        </span>
                        <h6 className="mt-3 text-xl font-bold leading-none text-foreground">{hospital.phone}</h6>
                        <div className="mt-4">
                          <a href={hospital.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#C71782] transition-opacity hover:opacity-80">
                            Know More <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accreditations */}
      <section id="awards" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Accreditations & <span className="text-accent">Certifications</span></h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">Elevating standards, ensuring excellence</p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "NABH Accreditation", desc: "National Accreditation Board for Hospitals" },
              { title: "NABH Nursing Excellence", desc: "Certified for nursing quality standards" },
              { title: "NABL Accreditation", desc: "Laboratory quality certification" },
              { title: "Great Place to Work", desc: "Certified since 2025" },
            ].map((award) => (
              <div key={award.title} className="rounded-xl border bg-background p-6 text-center shadow-card">
                <Award className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 text-sm font-bold text-foreground">{award.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{award.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-primary py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-primary-foreground/80">© 2026 Nurses Connect — Caritas Hospital & Institute of Health Sciences, Kottayam. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
