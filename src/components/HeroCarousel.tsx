
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useCarouselSlides } from '@/hooks/useSupabaseData';

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
  city: string;
  is_active: boolean;
  sort_order: number;
}

const HeroCarousel = () => {
  const { slides, loading } = useCarouselSlides();

  if (loading) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {slides.map((slide: CarouselSlide) => (
            <CarouselItem key={slide.id}>
              <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white max-w-4xl px-4">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                      {slide.title}
                    </h1>
                    <h2 className="text-xl md:text-2xl mb-6 text-blue-200">
                      {slide.subtitle}
                    </h2>
                    <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                      {slide.description}
                    </p>
                    <Link to={slide.button_link}>
                      <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
                        {slide.button_text}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default HeroCarousel;
