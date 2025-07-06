import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type WhereFilterOp
} from 'firebase/firestore'
import { useFirebase } from './useFirebase'

export const useFirestore = () => {
  const { db } = useFirebase()
  
  // Get a single document
  const getDocument = async <T = DocumentData>(
    collectionName: string, 
    documentId: string
  ): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, documentId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T
      }
      return null
    } catch (error) {
      console.error('Error getting document:', error)
      throw error
    }
  }
  
  // Get multiple documents with optional query
  const getDocuments = async <T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> => {
    try {
      const q = query(collection(db, collectionName), ...constraints)
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[]
    } catch (error) {
      console.error('Error getting documents:', error)
      throw error
    }
  }
  
  // Add a new document
  const addDocument = async (
    collectionName: string,
    data: DocumentData
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (error) {
      console.error('Error adding document:', error)
      throw error
    }
  }
  
  // Update an existing document
  const updateDocument = async (
    collectionName: string,
    documentId: string,
    data: Partial<DocumentData>
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, documentId)
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }
  
  // Delete a document
  const deleteDocument = async (
    collectionName: string,
    documentId: string
  ): Promise<void> => {
    try {
      await deleteDoc(doc(db, collectionName, documentId))
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }
  
  // Helper function to create where constraint
  const whereConstraint = (field: string, op: WhereFilterOp, value: any) => {
    return where(field, op, value)
  }
  
  // Helper function to create orderBy constraint
  const orderByConstraint = (field: string, direction: 'asc' | 'desc' = 'asc') => {
    return orderBy(field, direction)
  }
  
  // Helper function to create limit constraint
  const limitConstraint = (count: number) => {
    return limit(count)
  }
  
  return {
    getDocument,
    getDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    whereConstraint,
    orderByConstraint,
    limitConstraint
  }
}