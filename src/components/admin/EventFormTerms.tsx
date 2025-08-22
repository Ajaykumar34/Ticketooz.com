
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EventFormTermsProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormTerms = ({ formData, onInputChange }: EventFormTermsProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="terms">Terms and Conditions</Label>
      <Textarea
        id="terms"
        value={formData.termsAndConditions}
        onChange={(e) => onInputChange('termsAndConditions', e.target.value)}
        placeholder="Enter terms and conditions"
        rows={4}
      />
    </div>
  );
};

export default EventFormTerms;
