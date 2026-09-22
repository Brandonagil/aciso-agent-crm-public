'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  IconUser, 
  IconMail, 
  IconCalendar, 
  IconBuilding,
  IconGenderMale,
  IconGenderFemale,
  IconContract,
  IconClock
} from '@tabler/icons-react';
import { MemberProfile } from '@/lib/types/reports';

interface MemberProfileCardProps {
  profile: MemberProfile;
  className?: string;
}

export function MemberProfileCard({ profile, className }: MemberProfileCardProps) {
  const getStatusColor = (gekuendigt: number) => {
    if (gekuendigt === 0) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (gekuendigt === 1) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGenderIcon = (geschlecht: string) => {
    if (geschlecht.toLowerCase().includes('männlich')) {
      return IconGenderMale;
    } else if (geschlecht.toLowerCase().includes('weiblich')) {
      return IconGenderFemale;
    }
    return IconUser;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekannt';
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const GenderIcon = getGenderIcon(profile.geschlecht);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {profile.name || `Mitglied ${profile.mitglied_id}`}
              </h3>
              <Badge className={getStatusColor(profile.gekuendigt)}>
                {profile.gekuendigt === 0 ? 'Aktiv' : 'Gekündigt'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: {profile.mitglied_id}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="grid gap-4">
        {/* Kontaktinformationen */}
        <div className="grid gap-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Kontakt
          </h4>
          <div className="grid gap-2">
            {profile.email && (
              <div className="flex items-center gap-2 text-sm">
                <IconMail className="h-4 w-4 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile.studio_standort && (
              <div className="flex items-center gap-2 text-sm">
                <IconBuilding className="h-4 w-4 text-muted-foreground" />
                <span>{profile.studio_standort}</span>
              </div>
            )}
          </div>
        </div>

        {/* Demografische Daten */}
        <div className="grid gap-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Demografische Daten
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <GenderIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Geschlecht:</span>
              <span className="font-medium">{profile.geschlecht}</span>
            </div>
            {profile.alter && (
              <div className="flex items-center gap-2 text-sm">
                <IconUser className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Alter:</span>
                <span className="font-medium">{profile.alter} Jahre</span>
              </div>
            )}
          </div>
        </div>

        {/* Vertragsinformationen */}
        <div className="grid gap-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Vertrag
          </h4>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm">
              <IconContract className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Art:</span>
              <span className="font-medium">{profile.vertragsart}</span>
            </div>
            {profile.vertragslaufzeit_kategorie && (
              <div className="flex items-center gap-2 text-sm">
                <IconClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Laufzeit:</span>
                <span className="font-medium">{profile.vertragslaufzeit_kategorie}</span>
              </div>
            )}
            {profile.mitglied_seit && (
              <div className="flex items-center gap-2 text-sm">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mitglied seit:</span>
                <span className="font-medium">{formatDate(profile.mitglied_seit)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}