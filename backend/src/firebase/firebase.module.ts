import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Disponible dans toute l'app sans réimporter
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}