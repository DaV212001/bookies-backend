import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class SaveReadingProgressDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsString()
  @IsNotEmpty()
  cfi: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  progression: number;
}
