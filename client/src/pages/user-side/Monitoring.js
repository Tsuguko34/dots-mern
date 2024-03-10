import React, { useEffect, useState } from 'react'
import '../../styles/monitoring.css'
import { MonitoringTable, PageHeader } from '../../components'
import { useParams } from 'react-router-dom'
import { getAllUsers, getTableData } from '../../utils'
import toast from 'react-hot-toast'

function Monitoring() {
    const { monitoringType } = useParams()
    const [ documents, setDocuments ] = useState([])
    const [documentsToFilter, setDocumentsToFilter] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [users, setUsers] = useState([])
    const [filters, setFilters] = useState({
      searchFilter: '',
      docuNameFilter: '',
      docuTypeFilter: '',
      docuReceivedBy: '',
      officeDeptFilter: '',
      dateReceivedFilter: '',
      statusFilter: '',
    })

    //Get table data
    const getTableDocuments = async() => {
      setIsLoading(true)
      const res = await getTableData({ documentType: monitoringType })
      
      if(res?.status === 200){
        setIsLoading(false)
        setDocumentsToFilter(res.data?.documents)
      }
      else(
        toast.error('An error occured while fetching data.')
      )

    }

    const getUserOptions = async() => {
      const res = await getAllUsers()
      if(res?.status === 200){
        setUsers(res.data?.users)
      }
      else(
        toast.error('An error occured while fetching data.')
      )
    }
    
    useEffect(() => {
      if(documentsToFilter){
        const filteredDocs = documentsToFilter.filter(document => 
          document.document_Name.toLowerCase().includes(filters.searchFilter.toLowerCase()) ||
          document.description.toLowerCase().includes(filters.searchFilter.toLowerCase())
        ).filter(document => 
          document.document_Name.toLowerCase().includes(filters.docuNameFilter.toLowerCase())
        ).filter(document => 
          document.document_Type.toLowerCase().includes(filters.docuTypeFilter.toLowerCase())
        )
        .filter(document => 
          document.received_By.toLowerCase().includes(filters.docuReceivedBy.toLowerCase())
        )
        .filter(document => 
          document.office_Dept.toLowerCase().includes(filters.officeDeptFilter.toLowerCase())
        )
        .filter(document => 
          (document.date_Received.toLowerCase().includes(filters.dateReceivedFilter.toLowerCase()))
        )
        .filter(document => 
          document.status.toLowerCase().includes(filters.statusFilter.toLowerCase())
        )
    
        const sortedFilteredDocs = filteredDocs.sort((a, b) => {
          if (a.date_Received !== b.date_Received) {
              return new Date(b.date_Received + 'T' + b.time_Received) - new Date(a.date_Received + 'T' + a.time_Received);
          } else {
              return new Date(b.time_Received) - new Date(a.time_Received);
          }
        })
    
        setDocuments(sortedFilteredDocs);
      }
      else{
        setDocuments(documentsToFilter);
      }
      
    }, [filters, documentsToFilter])

    useEffect(() => {
      document.title = `${monitoringType} Monitoring`
      getTableDocuments()
      getUserOptions()
    }, [monitoringType])

    return (
      <section id='Monitoring' className='Monitoring'>
          <div className="wrapper">
            <PageHeader page={'Monitoring'}/>
            <div className="Monitoring_Table_Container">
              <MonitoringTable documentType={`${monitoringType}`} isLoading={isLoading} documents={documents} refreshTableFunc={getTableDocuments} users={users} setFilter={setFilters} filters={filters}/>
            </div>
          </div>
      </section>
    )
}

export default Monitoring