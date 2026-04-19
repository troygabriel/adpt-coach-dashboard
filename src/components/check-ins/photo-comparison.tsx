"use client";

import { useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CheckInPhoto } from "@/types";

interface PhotoComparisonProps {
  currentPhotos: CheckInPhoto[];
  clientId: string;
  coachId: string;
}

const ANGLE_LABELS: Record<string, string> = {
  front: "Front",
  back: "Back",
  side_left: "Left Side",
  side_right: "Right Side",
};

export function PhotoComparison({
  currentPhotos,
  clientId,
  coachId,
}: PhotoComparisonProps) {
  const [selectedAngle, setSelectedAngle] = useState<string>(
    currentPhotos[0]?.angle || "front"
  );
  const [sliderPosition, setSliderPosition] = useState(50);

  const angles = [...new Set(currentPhotos.map((p) => p.angle))];

  if (currentPhotos.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Camera className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-foreground">
            No progress photos
          </p>
          <p className="text-sm text-muted-foreground">
            Photos will appear here once the client submits them with their
            check-in.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPhoto = currentPhotos.find((p) => p.angle === selectedAngle);

  return (
    <div className="space-y-4">
      {/* Angle selector */}
      <div className="flex items-center gap-2">
        {angles.map((angle) => (
          <Button
            key={angle}
            variant={selectedAngle === angle ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedAngle(angle)}
          >
            {ANGLE_LABELS[angle] || angle}
          </Button>
        ))}
      </div>

      {/* Photo display */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current photo */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {currentPhoto
                  ? new Date(currentPhoto.created_at).toLocaleDateString()
                  : "N/A"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {currentPhoto ? (
              <div className="relative aspect-[3/4] rounded-md bg-secondary overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPhoto.file_path}
                  alt={`${ANGLE_LABELS[currentPhoto.angle]} progress photo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-secondary">
                <p className="text-sm text-muted-foreground">
                  No {ANGLE_LABELS[selectedAngle]?.toLowerCase()} photo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison placeholder — will show previous week's photo */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Previous
              </CardTitle>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Compare
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-secondary">
              <div className="text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Previous photo comparison
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Side-by-side with slider coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo timeline */}
      {currentPhotos.length > 1 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Photos This Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedAngle(photo.angle)}
                  className={`relative flex-shrink-0 h-20 w-16 rounded-md overflow-hidden border-2 transition-colors ${
                    selectedAngle === photo.angle
                      ? "border-primary"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.file_path}
                    alt={ANGLE_LABELS[photo.angle]}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center text-white py-0.5">
                    {ANGLE_LABELS[photo.angle]}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
