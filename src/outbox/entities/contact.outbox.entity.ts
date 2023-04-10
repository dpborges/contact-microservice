import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryGeneratedColumn,
  Index, 
} from 'typeorm'; 

/* Creates primary key on id and an index on email and an index on accountId */
@Entity()
export class ContactOutbox {
 
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  accountId: number;

  @Column()
  userId: string;
   
  @Column()
  subject: string;

  @Column()  
  payload: string;

  @Column()  
  status: string;
  
  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

}
