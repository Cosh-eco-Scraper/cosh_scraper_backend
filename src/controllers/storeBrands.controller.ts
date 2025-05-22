import { Request, Response, NextFunction } from 'express';
import storeBrandsService from '../services/storeBrands.service';

// export async function updateStoreBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
//     try {
//         const { storeId } = req.params;
//         const { brandId } = req.params;

//         if (!storeId) {
//             res.status(400).json({ message: 'Store ID is required' });
//         }

//         if (!brandId) {
//             res.status(400).json({ message: "Brand is required" });
//         }

//         await storeBrandsService.updateStoreBrands(Number(storeId), Number(brandId));
//         res.status(200).json({ message: 'Store brands updated successfully' });
//     } catch (error) {
//         next(error);
//     }
// }
