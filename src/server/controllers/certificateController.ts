import { Request, Response, NextFunction } from 'express';
import { certificateIssueSchema } from '../validation/schemas.ts';
import {
  getUserCertificates,
  issueCertificate,
  verifyCertificate,
} from '../services/certificateService.ts';

export const getMyCertificates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const certs = await getUserCertificates(userId);
    res.json({ certificates: certs });
  } catch (err) {
    next(err);
  }
};

export const requestCertificateIssuance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = certificateIssueSchema.parse(req.body);

    const certificate = await issueCertificate(userId, validated.course_id);
    res.status(201).json({
      message: 'Certificate successfully verified and issued',
      certificate,
    });
  } catch (err) {
    next(err);
  }
};

export const publicVerifyCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { certificateNumber } = req.params;
    const verification = await verifyCertificate(certificateNumber);
    res.json(verification);
  } catch (err) {
    next(err);
  }
};
