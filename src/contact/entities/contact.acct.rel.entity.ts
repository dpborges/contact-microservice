import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryColumn, 
  PrimaryGeneratedColumn,
  Index, 
  VersionColumn,
  ManyToMany,
  JoinTable
} from 'typeorm'; 

/**
 * Tracks which accounts the contact is in.
 * Note that an contact can exist in multiple accounts. Rather than creating the contact
 * for each account, we create contact once and keep track of accounts there exist 
 * in within this table.
 */
@Entity()
export class ContactAcctRel {
 
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  accountId: number;

  @Column()  
  contactId: number;

  @CreateDateColumn()
  createDate: Date;

}
