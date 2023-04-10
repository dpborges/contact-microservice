import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryColumn, 
  PrimaryGeneratedColumn,
  Index, 
  VersionColumn
} from 'typeorm'; 

/* Note, accountId was removed from contact enity and added to contact_acct_rel 
   table. By doing so, we can track if contact exists in more than one account without
   duplicating the contact record. The contact and contact_acct_rel table should 
   always be joined to see which account the contact belongs to. */
@Entity()
export class Contact {
 
  @PrimaryGeneratedColumn()
  id: number;

  @VersionColumn()
  version: number

  @Index()
  @Column()
  email: string;
   
  // @Index()
  // @Column()
  // accountId: number;

  @Column()  
  firstName: string;

  @Column()  
  lastName: string;

  @Column()
  mobilePhone: string;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

}

