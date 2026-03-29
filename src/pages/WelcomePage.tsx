import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MapPin, Award, Users, ChevronRight, Phone, Heart, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import hospital1 from "@/assets/hospital-1.jpg";
import hospital2 from "@/assets/hospital-2.jpg";
import hospital3 from "@/assets/hospital-3.jpg";

const slides = [
  { image: hospital1, title: "Guided by Expertise, Defined by Compassion", subtitle: "Experience healthcare at its finest at Caritas Hospital" },
  { image: hospital2, title: "65 Years of Healing, a Legacy of Excellence", subtitle: "A tapestry of excellence redefining healthcare since 1959" },
  { image: hospital3, title: "Walking in Compassion, Serving with Love", subtitle: "Fostering a healing environment driven by genuine warmth" },
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
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Caritas Hospital" className="h-10 w-10 rounded-lg" />
            <div>
              <span className="text-lg font-bold text-primary-foreground leading-tight block">Caritas Hospital</span>
              <span className="text-[10px] text-primary-foreground/70 leading-none">Nurses Connect</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">About</a>
            <a href="#departments" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Departments</a>
            <a href="#location" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Location</a>
            <a href="#awards" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Accreditations</a>
            <div className="ml-4 flex gap-2">
              <Link to="/nurse-login"><Button variant="pink" size="sm">Nurse Portal</Button></Link>
              <Link to="/headnurse-login"><Button variant="secondary" size="sm" className="font-semibold">Head Nurse</Button></Link>
              <Link to="/admin-login"><Button variant="secondary" size="sm" className="font-semibold">Admin</Button></Link>
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
                <Link to="/nurse-login"><Button variant="pink" size="sm" className="w-full">Nurse Portal</Button></Link>
                <Link to="/headnurse-login"><Button variant="secondary" size="sm" className="w-full">Head Nurse</Button></Link>
                <Link to="/admin-login"><Button variant="secondary" size="sm" className="w-full">Admin</Button></Link>
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
              <Link to="/nurse-login">
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
      <section id="location" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Our <span className="text-primary">Location</span></h2>
          <div className="mx-auto mt-8 max-w-xl rounded-xl bg-card p-8 shadow-card text-center">
            <MapPin className="mx-auto h-10 w-10 text-accent" />
            <h3 className="mt-4 text-xl font-bold text-foreground">Caritas Hospital & Institute of Health Sciences</h3>
            <p className="mt-2 text-muted-foreground">Thellakom P.O., Kottayam<br />Kerala - 686630, India</p>
            <p className="mt-4 text-sm text-muted-foreground">Open 24/7 • Emergency: +91(0) 9496 555 200</p>
            <p className="mt-1 text-sm text-muted-foreground">General: 0481 279 2500</p>
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
