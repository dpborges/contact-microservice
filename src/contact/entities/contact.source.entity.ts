import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryColumn, 
  PrimaryGeneratedColumn,
} from 'typeorm'; 

@Entity()
export class ContactSource {
 
  @PrimaryGeneratedColumn()
  id: number;
  
  // @PrimaryColumn()
  accountId: string;

  @Column()  
  sourceType: string;  // holds source type,  such as 'Application' or 'Form'

  @Column()  
  sourceName: string;  // holds source name,  such as 'pivitee' or 'XYZ Subscription Form'

  @Column()
  contactId: number;

  @CreateDateColumn()
  createDate: Date;

}
