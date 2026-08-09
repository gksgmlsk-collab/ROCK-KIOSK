
export type LapRange='1_2'|'3_5'|'6_9'|'10_PLUS';
export type Student={id:string;schoolYear:number;grade:number;classNo:number;studentNo:number;pin?:string;registrationCode:string;codeUsed:boolean;consent:boolean;failedAttempts:number;lockedUntil?:number;active:boolean};
export type WalkingRecord={id:string;studentId:string;recordDate:string;lapRange:LapRange;createdAt:string};
