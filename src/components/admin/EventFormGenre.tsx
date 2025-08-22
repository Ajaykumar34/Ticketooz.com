
import GenreSelector from './GenreSelector';

interface EventFormGenreProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormGenre = ({ formData, onInputChange }: EventFormGenreProps) => {
  const handleGenresChange = (genres: string[]) => {
    onInputChange('genres', genres);
  };

  return (
    <div className="space-y-6">
      <GenreSelector
        selectedGenres={formData.genres || []}
        onGenresChange={handleGenresChange}
      />
    </div>
  );
};

export default EventFormGenre;
