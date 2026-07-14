import { Module } from '@nestjs/common';
import { CharacterSheetService } from './character-sheet.service';
import { UserProvisioningService } from './user-provisioning.service';

@Module({
  providers: [UserProvisioningService, CharacterSheetService],
  exports: [UserProvisioningService, CharacterSheetService],
})
export class UserModule {}
